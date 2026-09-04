import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { LoadedTemplatePageMetadata } from '../domain/template-types'
import type {
  PdfDocumentLoader,
  PdfTemplateDocument,
  PdfWidget,
  PdfWidgetKind,
  RenderedPdfPage,
  RenderPdfPageInput,
  TopLeftRectanglePt,
} from './pdf-document'
import { PdfDocumentError } from './pdf-document'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface PdfJsWidgetAnnotation {
  id?: string
  subtype: 'Widget'
  fieldName?: string
  fieldType?: string
  rect: [number, number, number, number]
  checkBox?: boolean
  radioButton?: boolean
  comb?: boolean
  maxLen?: number
}

export const pdfJsDocumentLoader: PdfDocumentLoader = {
  async load(bytes) {
    try {
      // PDF.js may transfer its input buffer to the worker, so it receives an owned copy.
      const loadingTask = getDocument({ data: Uint8Array.from(bytes) })
      const pdfDocument = await loadingTask.promise
      return new PdfJsTemplateDocument(pdfDocument)
    } catch (error) {
      throw new PdfDocumentError(
        'LOAD_FAILED',
        'The selected file could not be loaded as a PDF.',
        error,
      )
    }
  },
}

class PdfJsTemplateDocument implements PdfTemplateDocument {
  readonly pageCount: number
  private readonly pdfDocument: PDFDocumentProxy
  private readonly activeRenderTasks = new WeakMap<
    HTMLCanvasElement,
    RenderTask
  >()
  private readonly latestRenderRequests = new WeakMap<
    HTMLCanvasElement,
    object
  >()

  constructor(pdfDocument: PDFDocumentProxy) {
    this.pdfDocument = pdfDocument
    this.pageCount = pdfDocument.numPages
  }

  async getPageMetadata(): Promise<LoadedTemplatePageMetadata[]> {
    try {
      const pageNumbers = createPageNumbers(this.pageCount)
      return await Promise.all(
        pageNumbers.map(async (pageNumber) => {
          const page = await this.pdfDocument.getPage(pageNumber)
          return readPageMetadata(page, pageNumber)
        }),
      )
    } catch (error) {
      throw new PdfDocumentError(
        'INSPECTION_FAILED',
        'The PDF page metadata could not be inspected.',
        error,
      )
    }
  }

  async getWidgets(pageNumber?: number): Promise<PdfWidget[]> {
    const pageNumbers =
      pageNumber === undefined
        ? createPageNumbers(this.pageCount)
        : [this.assertPageNumber(pageNumber)]

    try {
      const widgetsByPage = await Promise.all(
        pageNumbers.map(async (currentPageNumber) => {
          const page = await this.pdfDocument.getPage(currentPageNumber)
          return readPageWidgets(page, currentPageNumber)
        }),
      )

      return widgetsByPage.flat()
    } catch (error) {
      if (error instanceof PdfDocumentError) {
        throw error
      }

      throw new PdfDocumentError(
        'INSPECTION_FAILED',
        'The PDF form fields could not be inspected.',
        error,
      )
    }
  }

  async renderPage({
    pageNumber,
    scale,
    outputScale,
    canvas,
  }: RenderPdfPageInput): Promise<RenderedPdfPage> {
    const validPageNumber = this.assertPageNumber(pageNumber)
    assertPositiveFinite(scale, 'scale')
    assertPositiveFinite(outputScale, 'outputScale')
    const renderRequest = {}
    this.latestRenderRequests.set(canvas, renderRequest)
    this.activeRenderTasks.get(canvas)?.cancel()

    try {
      const page = await this.pdfDocument.getPage(validPageNumber)

      if (this.latestRenderRequests.get(canvas) !== renderRequest) {
        throw new PdfDocumentError(
          'RENDER_CANCELLED',
          `PDF page ${validPageNumber} rendering was superseded.`,
        )
      }

      const displayViewport = page.getViewport({ scale })
      const renderViewport = page.getViewport({ scale: scale * outputScale })

      canvas.width = Math.ceil(renderViewport.width)
      canvas.height = Math.ceil(renderViewport.height)
      canvas.style.width = `${displayViewport.width}px`
      canvas.style.height = `${displayViewport.height}px`

      const renderTask = page.render({ canvas, viewport: renderViewport })
      this.activeRenderTasks.set(canvas, renderTask)
      await renderTask.promise

      return {
        widthPx: displayViewport.width,
        heightPx: displayViewport.height,
        rotationDegrees: displayViewport.rotation,
      }
    } catch (error) {
      if (error instanceof PdfDocumentError) {
        throw error
      }

      throw new PdfDocumentError(
        'RENDER_FAILED',
        `PDF page ${validPageNumber} could not be rendered.`,
        error,
      )
    } finally {
      if (this.latestRenderRequests.get(canvas) === renderRequest) {
        this.latestRenderRequests.delete(canvas)
        this.activeRenderTasks.delete(canvas)
      }
    }
  }

  async destroy(): Promise<void> {
    await this.pdfDocument.destroy()
  }

  private assertPageNumber(pageNumber: number): number {
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > this.pageCount
    ) {
      throw new PdfDocumentError(
        'PAGE_OUT_OF_RANGE',
        `Page number must be between 1 and ${this.pageCount}.`,
      )
    }

    return pageNumber
  }
}

function readPageMetadata(
  page: PDFPageProxy,
  pageNumber: number,
): LoadedTemplatePageMetadata {
  const viewport = page.getViewport({ scale: 1 })
  page.cleanup()

  return {
    pageNumber,
    widthPt: viewport.width,
    heightPt: viewport.height,
    rotationDegrees: viewport.rotation,
  }
}

async function readPageWidgets(
  page: PDFPageProxy,
  pageNumber: number,
): Promise<PdfWidget[]> {
  try {
    const viewport = page.getViewport({ scale: 1 })
    const annotations = (await page.getAnnotations()) as unknown[]
    const widgets: PdfWidget[] = []

    for (const [annotationIndex, annotation] of annotations.entries()) {
      if (!isPdfJsWidgetAnnotation(annotation)) {
        continue
      }

      const convertedRectangle: unknown = viewport.convertToViewportRectangle(
        annotation.rect,
      )
      const rectPt = parseRectangle(convertedRectangle)

      if (rectPt === undefined) {
        continue
      }

      const pdfId = annotation.id ?? `${pageNumber}-${annotationIndex}`

      const characterCells = readCharacterCells(annotation)

      widgets.push({
        pdfId,
        fieldName: annotation.fieldName ?? `Unnamed PDF field ${pdfId}`,
        pageNumber,
        kind: classifyWidget(annotation),
        rectPt,
        ...(characterCells === undefined ? {} : { characterCells }),
      })
    }

    return widgets
  } finally {
    page.cleanup()
  }
}

function isPdfJsWidgetAnnotation(
  value: unknown,
): value is PdfJsWidgetAnnotation {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.subtype === 'Widget' &&
    isRectangle(candidate.rect) &&
    (candidate.id === undefined || typeof candidate.id === 'string') &&
    (candidate.fieldName === undefined ||
      typeof candidate.fieldName === 'string') &&
    (candidate.fieldType === undefined ||
      typeof candidate.fieldType === 'string') &&
    (candidate.checkBox === undefined ||
      typeof candidate.checkBox === 'boolean') &&
    (candidate.radioButton === undefined ||
      typeof candidate.radioButton === 'boolean') &&
    (candidate.comb === undefined || typeof candidate.comb === 'boolean') &&
    (candidate.maxLen === undefined || typeof candidate.maxLen === 'number')
  )
}

/*
 * A comb widget declares how many equal cells its box is divided into. Tax
 * forms print separator ticks at those boundaries, so the cell count is needed
 * to place characters between them rather than as one centered run.
 */
function readCharacterCells(
  annotation: PdfJsWidgetAnnotation,
): number | undefined {
  if (annotation.comb !== true || annotation.maxLen === undefined) {
    return undefined
  }

  return Number.isInteger(annotation.maxLen) && annotation.maxLen > 0
    ? annotation.maxLen
    : undefined
}

function classifyWidget(annotation: PdfJsWidgetAnnotation): PdfWidgetKind {
  if (annotation.checkBox === true) {
    return 'checkbox'
  }

  if (annotation.radioButton === true) {
    return 'radio'
  }

  switch (annotation.fieldType) {
    case 'Tx':
      return 'text'
    case 'Ch':
      return 'choice'
    case 'Sig':
      return 'signature'
    case 'Btn':
      return 'button'
    default:
      return 'unknown'
  }
}

function parseRectangle(value: unknown): TopLeftRectanglePt | undefined {
  if (!isRectangle(value)) {
    return undefined
  }

  return {
    x1Pt: value[0],
    y1Pt: value[1],
    x2Pt: value[2],
    y2Pt: value[3],
  }
}

function isRectangle(value: unknown): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((coordinate) =>
      typeof coordinate === 'number' && Number.isFinite(coordinate)
    )
  )
}

function createPageNumbers(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, index) => index + 1)
}

function assertPositiveFinite(value: number, propertyName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new PdfDocumentError(
      'RENDER_FAILED',
      `${propertyName} must be finite and greater than zero.`,
    )
  }
}
