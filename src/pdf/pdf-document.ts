import type { LoadedTemplatePageMetadata } from '../domain/template-types'

export type PdfWidgetKind =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'choice'
  | 'signature'
  | 'button'
  | 'unknown'

// Coordinates are PDF points at viewport scale 1 with a top-left origin.
// A page transform may reverse either pair of rectangle endpoints.
export interface TopLeftRectanglePt {
  x1Pt: number
  y1Pt: number
  x2Pt: number
  y2Pt: number
}

export interface PdfWidget {
  pdfId: string
  fieldName: string
  pageNumber: number
  kind: PdfWidgetKind
  rectPt: TopLeftRectanglePt
  // Present when the widget is a comb field, holding its declared cell count.
  characterCells?: number
}

export interface RenderPdfPageInput {
  pageNumber: number
  scale: number
  outputScale: number
  canvas: HTMLCanvasElement
}

export interface RenderedPdfPage {
  widthPx: number
  heightPx: number
  rotationDegrees: number
}

export interface PdfTemplateDocument {
  readonly pageCount: number
  getPageMetadata(): Promise<LoadedTemplatePageMetadata[]>
  getWidgets(pageNumber?: number): Promise<PdfWidget[]>
  renderPage(input: RenderPdfPageInput): Promise<RenderedPdfPage>
  destroy(): Promise<void>
}

export interface PdfDocumentLoader {
  load(bytes: Uint8Array): Promise<PdfTemplateDocument>
}

export type PdfDocumentErrorCode =
  | 'LOAD_FAILED'
  | 'PAGE_OUT_OF_RANGE'
  | 'INSPECTION_FAILED'
  | 'RENDER_CANCELLED'
  | 'RENDER_FAILED'

export class PdfDocumentError extends Error {
  readonly code: PdfDocumentErrorCode

  constructor(code: PdfDocumentErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'PdfDocumentError'
    this.code = code
  }
}
