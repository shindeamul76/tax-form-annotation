import {
  PDFDocument,
  StandardFonts,
  clip,
  concatTransformationMatrix,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type {
  AnnotationDocument,
  JsonValue,
} from '../domain/annotation-types'
import { toPdfBox, type PdfBoxPt } from '../domain/coordinates'
import type { Diagnostic } from '../domain/diagnostics'
import {
  resolveRenderValues,
  type RenderValue,
} from '../domain/render-values'
import { validateDatasetContract } from '../domain/validation'
import {
  layoutPdfText,
  type PdfFontMetrics,
  type PdfTextLayout,
} from './pdf-text-layout'

export type FilledPdfGenerationResult =
  | {
      status: 'ready'
      bytes: Uint8Array
      diagnostics: Diagnostic[]
    }
  | {
      status: 'error'
      diagnostics: Diagnostic[]
    }

interface GenerateFilledPdfInput {
  annotation: AnnotationDocument
  templateBytes: Uint8Array
  dataset: JsonValue
}

const supportedStandardFonts = new Set<string>(Object.values(StandardFonts))

export async function generateFilledPdf({
  annotation,
  templateBytes,
  dataset,
}: GenerateFilledPdfInput): Promise<FilledPdfGenerationResult> {
  const dataContractDiagnostics = validateDatasetContract(
    annotation.dataContract,
    dataset,
  )
  const renderValuesResult = resolveRenderValues(annotation, dataset)
  const diagnostics = [
    ...dataContractDiagnostics,
    ...renderValuesResult.diagnostics,
  ]

  if (hasErrors(diagnostics)) {
    return { status: 'error', diagnostics }
  }

  let pdfDocument: PDFDocument

  try {
    pdfDocument = await PDFDocument.load(Uint8Array.from(templateBytes))
  } catch {
    return {
      status: 'error',
      diagnostics: [
        ...diagnostics,
        createPdfDiagnostic(
          'PDF_TEMPLATE_LOAD_FAILED',
          'The source PDF could not be loaded for filled-PDF generation.',
        ),
      ],
    }
  }

  const embeddedFonts = new Map<string, PDFFont>()

  for (const value of renderValuesResult.values) {
    const fieldDiagnostics = await drawRenderValue({
      value,
      pdfDocument,
      embeddedFonts,
    })
    diagnostics.push(...fieldDiagnostics)
  }

  if (hasErrors(diagnostics)) {
    return { status: 'error', diagnostics }
  }

  try {
    return {
      status: 'ready',
      bytes: await pdfDocument.save(),
      diagnostics,
    }
  } catch {
    return {
      status: 'error',
      diagnostics: [
        ...diagnostics,
        createPdfDiagnostic(
          'PDF_SAVE_FAILED',
          'The filled PDF could not be serialized.',
        ),
      ],
    }
  }
}

interface DrawRenderValueInput {
  value: RenderValue
  pdfDocument: PDFDocument
  embeddedFonts: Map<string, PDFFont>
}

async function drawRenderValue({
  value,
  pdfDocument,
  embeddedFonts,
}: DrawRenderValueInput): Promise<Diagnostic[]> {
  const page = pdfDocument.getPages()[value.page - 1]

  if (page === undefined) {
    return [
      createFieldPdfDiagnostic(
        value,
        'PDF_PAGE_NOT_FOUND',
        `PDF page ${value.page} does not exist.`,
      ),
    ]
  }

  if (!supportedStandardFonts.has(value.style.fontFamily)) {
    return [
      createFieldPdfDiagnostic(
        value,
        'PDF_FONT_UNSUPPORTED',
        `Font "${value.style.fontFamily}" is not registered by the sample renderer.`,
      ),
    ]
  }

  let font: PDFFont

  try {
    font = await getEmbeddedFont(
      pdfDocument,
      embeddedFonts,
      value.style.fontFamily,
    )
  } catch {
    return [
      createFieldPdfDiagnostic(
        value,
        'PDF_FONT_EMBED_FAILED',
        `Font "${value.style.fontFamily}" could not be embedded.`,
      ),
    ]
  }

  const unsupportedCharacter = findUnsupportedCharacter(value.text, font)

  if (unsupportedCharacter !== undefined) {
    return [
      createFieldPdfDiagnostic(
        value,
        'PDF_CHARACTER_UNSUPPORTED',
        `Font "${value.style.fontFamily}" cannot encode ${formatCharacter(unsupportedCharacter)}.`,
      ),
    ]
  }

  const boxPt = toPdfBox(value.box, {
    widthPt: page.getWidth(),
    heightPt: page.getHeight(),
  })
  let layoutResult: ReturnType<typeof layoutPdfText>

  try {
    layoutResult = layoutPdfText({
      text: value.text,
      boxPt,
      style: value.style,
      maximumLines: value.maximumLines,
      metrics: createPdfFontMetrics(font),
    })
  } catch {
    return [
      createFieldPdfDiagnostic(
        value,
        'PDF_TEXT_MEASUREMENT_FAILED',
        'The formatted value could not be measured with the selected font.',
      ),
    ]
  }

  if (layoutResult.status === 'error') {
    return [
      createFieldPdfDiagnostic(
        value,
        layoutResult.code,
        layoutResult.message,
      ),
    ]
  }

  try {
    drawTextLayout(page, layoutResult.layout, value, font)
    return []
  } catch {
    return [
      createFieldPdfDiagnostic(
        value,
        'PDF_TEXT_DRAW_FAILED',
        'The formatted value could not be drawn into the PDF.',
      ),
    ]
  }
}

async function getEmbeddedFont(
  pdfDocument: PDFDocument,
  embeddedFonts: Map<string, PDFFont>,
  fontFamily: string,
): Promise<PDFFont> {
  const existingFont = embeddedFonts.get(fontFamily)

  if (existingFont !== undefined) {
    return existingFont
  }

  const font = await pdfDocument.embedFont(fontFamily)
  embeddedFonts.set(fontFamily, font)
  return font
}

function createPdfFontMetrics(font: PDFFont): PdfFontMetrics {
  return {
    measureTextWidthPt: (text, fontSizePt) =>
      font.widthOfTextAtSize(text, fontSizePt),
    measureFontHeightPt: (fontSizePt) =>
      font.heightAtSize(fontSizePt, { descender: true }),
    measureFontAscenderHeightPt: (fontSizePt) =>
      font.heightAtSize(fontSizePt, { descender: false }),
  }
}

function drawTextLayout(
  page: PDFPage,
  layout: PdfTextLayout,
  value: RenderValue,
  font: PDFFont,
): void {
  if (layout.lines.length === 0) {
    return
  }

  const clipBoxPt = layout.clipBoxPt
  page.pushOperators(
    pushGraphicsState(),
    rectangle(
      clipBoxPt.xPt,
      clipBoxPt.yPt,
      clipBoxPt.widthPt,
      clipBoxPt.heightPt,
    ),
    clip(),
    endPath(),
  )

  if (value.style.rotationDegrees !== 0) {
    page.pushOperators(
      createCenteredRotationOperator(
        clipBoxPt,
        value.style.rotationDegrees,
      ),
    )
  }

  const color = parseHexColor(value.style.color)

  try {
    for (const line of layout.lines) {
      page.drawText(line.text, {
        x: line.xPt,
        y: line.baselineYPt,
        size: layout.fontSizePt,
        font,
        color,
      })
    }
  } finally {
    page.pushOperators(popGraphicsState())
  }
}

function createCenteredRotationOperator(
  boxPt: PdfBoxPt,
  clockwiseDegrees: number,
) {
  const centerXPt = boxPt.xPt + boxPt.widthPt / 2
  const centerYPt = boxPt.yPt + boxPt.heightPt / 2
  const radians = (-clockwiseDegrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)

  return concatTransformationMatrix(
    cosine,
    sine,
    -sine,
    cosine,
    centerXPt - cosine * centerXPt + sine * centerYPt,
    centerYPt - sine * centerXPt - cosine * centerYPt,
  )
}

function parseHexColor(hexColor: string) {
  const red = Number.parseInt(hexColor.slice(1, 3), 16) / 255
  const green = Number.parseInt(hexColor.slice(3, 5), 16) / 255
  const blue = Number.parseInt(hexColor.slice(5, 7), 16) / 255
  return rgb(red, green, blue)
}

function findUnsupportedCharacter(
  text: string,
  font: PDFFont,
): string | undefined {
  const supportedCodePoints = new Set(font.getCharacterSet())

  return [...text].find((character) => {
    if (character === '\n' || character === '\r') {
      return false
    }

    const codePoint = character.codePointAt(0)
    return codePoint === undefined || !supportedCodePoints.has(codePoint)
  })
}

function formatCharacter(character: string): string {
  const codePoint = character.codePointAt(0)
  const codePointText =
    codePoint === undefined
      ? 'an unsupported character'
      : `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
  return `character "${character}" (${codePointText})`
}

function createFieldPdfDiagnostic(
  value: RenderValue,
  code: string,
  message: string,
): Diagnostic {
  return {
    severity: 'error',
    code,
    message,
    fieldId: value.fieldId,
    page: value.page,
  }
}

function createPdfDiagnostic(code: string, message: string): Diagnostic {
  return { severity: 'error', code, message }
}

function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(({ severity }) => severity === 'error')
}
