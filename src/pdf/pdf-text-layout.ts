import type { FieldStyle } from '../domain/annotation-types'
import type { PdfBoxPt } from '../domain/coordinates'

const FIT_TOLERANCE_PT = 0.0001
const SHRINK_SEARCH_ITERATIONS = 24

export interface PdfFontMetrics {
  measureTextWidthPt: (text: string, fontSizePt: number) => number
  measureFontHeightPt: (fontSizePt: number) => number
  measureFontAscenderHeightPt: (fontSizePt: number) => number
}

export interface PositionedPdfTextLine {
  text: string
  xPt: number
  baselineYPt: number
  widthPt: number
}

export interface PdfTextLayout {
  fontSizePt: number
  lines: PositionedPdfTextLine[]
  clipBoxPt: PdfBoxPt
}

export type PdfTextLayoutResult =
  | { status: 'ready'; layout: PdfTextLayout }
  | { status: 'error'; code: 'PDF_TEXT_OVERFLOW'; message: string }

interface LayoutPdfTextInput {
  text: string
  boxPt: PdfBoxPt
  style: FieldStyle
  maximumLines?: number
  metrics: PdfFontMetrics
}

export function layoutPdfText({
  text,
  boxPt,
  style,
  maximumLines,
  metrics,
}: LayoutPdfTextInput): PdfTextLayoutResult {
  const clipBoxPt = createContentBox(boxPt, style.paddingPt)

  if (clipBoxPt.widthPt <= 0 || clipBoxPt.heightPt <= 0) {
    return createOverflowFailure('Field padding leaves no printable area.')
  }

  if (text.length === 0) {
    return {
      status: 'ready',
      layout: { fontSizePt: style.fontSizePt, lines: [], clipBoxPt },
    }
  }

  if (style.characterCells !== undefined) {
    return createCombLayout(text, style.characterCells, clipBoxPt, style, metrics)
  }

  const sourceLines = splitLines(text)
  const permittedLineCount = maximumLines ?? Number.POSITIVE_INFINITY

  switch (style.overflow) {
    case 'clip':
      return createReadyLayout(
        sourceLines.slice(0, permittedLineCount),
        style.fontSizePt,
        clipBoxPt,
        style,
        metrics,
      )
    case 'wrap': {
      const wrappedLines = wrapLines(
        sourceLines,
        clipBoxPt.widthPt,
        style.fontSizePt,
        metrics,
      )

      return createFittedLayout(
        wrappedLines,
        style.fontSizePt,
        permittedLineCount,
        clipBoxPt,
        style,
        metrics,
      )
    }
    case 'error':
      return createFittedLayout(
        sourceLines,
        style.fontSizePt,
        permittedLineCount,
        clipBoxPt,
        style,
        metrics,
      )
    case 'shrink':
      return createShrinkLayout(
        sourceLines,
        permittedLineCount,
        clipBoxPt,
        style,
        metrics,
      )
  }
}

/*
 * Comb fields print one character per cell so the glyphs land between the
 * separator ticks the form already draws. Each character is emitted as its own
 * positioned run sharing a single baseline, so the caller draws it exactly the
 * way it draws ordinary lines.
 */
function createCombLayout(
  text: string,
  characterCells: number,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): PdfTextLayoutResult {
  const characters = [...splitLines(text).join('')]

  if (characters.length > characterCells) {
    return createOverflowFailure(
      `The value has ${characters.length} characters but the field provides ${characterCells} comb cells.`,
    )
  }

  const cellWidthPt = clipBoxPt.widthPt / characterCells
  const fontSizePt = resolveCombFontSize(
    characters,
    cellWidthPt,
    clipBoxPt,
    style,
    metrics,
  )

  if (fontSizePt === undefined) {
    return createOverflowFailure(
      `The value does not fit inside ${characterCells} comb cells at the permitted font sizes.`,
    )
  }

  const fontHeightPt = metrics.measureFontHeightPt(fontSizePt)
  const ascenderHeightPt = metrics.measureFontAscenderHeightPt(fontSizePt)
  const descenderHeightPt = Math.max(fontHeightPt - ascenderHeightPt, 0)
  const baselineYPt =
    alignBlockVertically(fontHeightPt, clipBoxPt, style.verticalAlign) +
    descenderHeightPt

  return {
    status: 'ready',
    layout: {
      fontSizePt,
      clipBoxPt,
      lines: characters.map((character, cellIndex) => {
        const widthPt = metrics.measureTextWidthPt(character, fontSizePt)
        return {
          text: character,
          widthPt,
          xPt:
            clipBoxPt.xPt +
            cellIndex * cellWidthPt +
            (cellWidthPt - widthPt) / 2,
          baselineYPt,
        }
      }),
    },
  }
}

function resolveCombFontSize(
  characters: string[],
  cellWidthPt: number,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): number | undefined {
  const doesFit = (fontSizePt: number) =>
    doesCombFit(characters, cellWidthPt, clipBoxPt, fontSizePt, metrics)

  if (doesFit(style.fontSizePt)) {
    return style.fontSizePt
  }

  // Clipping is a deliberate choice to draw whatever lands inside the box.
  if (style.overflow === 'clip') {
    return style.fontSizePt
  }

  if (style.overflow !== 'shrink' || !doesFit(style.minimumFontSizePt)) {
    return undefined
  }

  let smallestFittingSizePt = style.minimumFontSizePt
  let largestFailingSizePt = style.fontSizePt

  for (let iteration = 0; iteration < SHRINK_SEARCH_ITERATIONS; iteration += 1) {
    const candidateSizePt = (smallestFittingSizePt + largestFailingSizePt) / 2

    if (doesFit(candidateSizePt)) {
      smallestFittingSizePt = candidateSizePt
    } else {
      largestFailingSizePt = candidateSizePt
    }
  }

  return smallestFittingSizePt
}

function doesCombFit(
  characters: string[],
  cellWidthPt: number,
  clipBoxPt: PdfBoxPt,
  fontSizePt: number,
  metrics: PdfFontMetrics,
): boolean {
  if (
    metrics.measureFontHeightPt(fontSizePt) >
    clipBoxPt.heightPt + FIT_TOLERANCE_PT
  ) {
    return false
  }

  return characters.every(
    (character) =>
      metrics.measureTextWidthPt(character, fontSizePt) <=
      cellWidthPt + FIT_TOLERANCE_PT,
  )
}

function createContentBox(boxPt: PdfBoxPt, paddingPt: number): PdfBoxPt {
  return {
    xPt: boxPt.xPt + paddingPt,
    yPt: boxPt.yPt + paddingPt,
    widthPt: boxPt.widthPt - paddingPt * 2,
    heightPt: boxPt.heightPt - paddingPt * 2,
  }
}

function createFittedLayout(
  lines: string[],
  fontSizePt: number,
  maximumLines: number,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): PdfTextLayoutResult {
  if (lines.length > maximumLines) {
    return createOverflowFailure(
      `The value requires ${lines.length} lines but the field permits ${maximumLines}.`,
    )
  }

  const layout = positionLines(lines, fontSizePt, clipBoxPt, style, metrics)
  return doesLayoutFit(layout, clipBoxPt, style, metrics)
    ? { status: 'ready', layout }
    : createOverflowFailure('The formatted value does not fit inside the field box.')
}

function createShrinkLayout(
  lines: string[],
  maximumLines: number,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): PdfTextLayoutResult {
  if (lines.length > maximumLines) {
    return createOverflowFailure(
      `The value requires ${lines.length} lines but the field permits ${maximumLines}.`,
    )
  }

  const preferredLayout = positionLines(
    lines,
    style.fontSizePt,
    clipBoxPt,
    style,
    metrics,
  )

  if (doesLayoutFit(preferredLayout, clipBoxPt, style, metrics)) {
    return { status: 'ready', layout: preferredLayout }
  }

  const minimumLayout = positionLines(
    lines,
    style.minimumFontSizePt,
    clipBoxPt,
    style,
    metrics,
  )

  if (!doesLayoutFit(minimumLayout, clipBoxPt, style, metrics)) {
    return createOverflowFailure(
      `The formatted value does not fit at the minimum font size of ${style.minimumFontSizePt} points.`,
    )
  }

  let smallestFittingSizePt = style.minimumFontSizePt
  let largestFailingSizePt = style.fontSizePt

  for (
    let iteration = 0;
    iteration < SHRINK_SEARCH_ITERATIONS;
    iteration += 1
  ) {
    const candidateSizePt =
      (smallestFittingSizePt + largestFailingSizePt) / 2
    const candidateLayout = positionLines(
      lines,
      candidateSizePt,
      clipBoxPt,
      style,
      metrics,
    )

    if (doesLayoutFit(candidateLayout, clipBoxPt, style, metrics)) {
      smallestFittingSizePt = candidateSizePt
    } else {
      largestFailingSizePt = candidateSizePt
    }
  }

  return {
    status: 'ready',
    layout: positionLines(
      lines,
      smallestFittingSizePt,
      clipBoxPt,
      style,
      metrics,
    ),
  }
}

function createReadyLayout(
  lines: string[],
  fontSizePt: number,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): PdfTextLayoutResult {
  return {
    status: 'ready',
    layout: positionLines(lines, fontSizePt, clipBoxPt, style, metrics),
  }
}

function positionLines(
  lines: string[],
  fontSizePt: number,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): PdfTextLayout {
  const fontHeightPt = metrics.measureFontHeightPt(fontSizePt)
  const ascenderHeightPt = metrics.measureFontAscenderHeightPt(fontSizePt)
  const descenderHeightPt = Math.max(fontHeightPt - ascenderHeightPt, 0)
  const lineAdvancePt = fontSizePt * style.lineHeight
  const blockHeightPt =
    fontHeightPt + Math.max(lines.length - 1, 0) * lineAdvancePt
  const blockBottomPt = alignBlockVertically(
    blockHeightPt,
    clipBoxPt,
    style.verticalAlign,
  )
  const firstBaselineYPt =
    blockBottomPt +
    descenderHeightPt +
    Math.max(lines.length - 1, 0) * lineAdvancePt

  return {
    fontSizePt,
    clipBoxPt,
    lines: lines.map((text, lineIndex) => {
      const widthPt = metrics.measureTextWidthPt(text, fontSizePt)
      return {
        text,
        widthPt,
        xPt: alignLineHorizontally(
          widthPt,
          clipBoxPt,
          style.horizontalAlign,
        ),
        baselineYPt: firstBaselineYPt - lineIndex * lineAdvancePt,
      }
    }),
  }
}

function alignLineHorizontally(
  lineWidthPt: number,
  boxPt: PdfBoxPt,
  alignment: FieldStyle['horizontalAlign'],
): number {
  switch (alignment) {
    case 'left':
      return boxPt.xPt
    case 'center':
      return boxPt.xPt + (boxPt.widthPt - lineWidthPt) / 2
    case 'right':
      return boxPt.xPt + boxPt.widthPt - lineWidthPt
  }
}

function alignBlockVertically(
  blockHeightPt: number,
  boxPt: PdfBoxPt,
  alignment: FieldStyle['verticalAlign'],
): number {
  switch (alignment) {
    case 'bottom':
      return boxPt.yPt
    case 'middle':
      return boxPt.yPt + (boxPt.heightPt - blockHeightPt) / 2
    case 'top':
      return boxPt.yPt + boxPt.heightPt - blockHeightPt
  }
}

function doesLayoutFit(
  layout: PdfTextLayout,
  clipBoxPt: PdfBoxPt,
  style: FieldStyle,
  metrics: PdfFontMetrics,
): boolean {
  const fontHeightPt = metrics.measureFontHeightPt(layout.fontSizePt)
  const ascenderHeightPt = metrics.measureFontAscenderHeightPt(layout.fontSizePt)
  const descenderHeightPt = Math.max(fontHeightPt - ascenderHeightPt, 0)
  const centerXPt = clipBoxPt.xPt + clipBoxPt.widthPt / 2
  const centerYPt = clipBoxPt.yPt + clipBoxPt.heightPt / 2
  const rotationRadians = (-style.rotationDegrees * Math.PI) / 180

  return layout.lines.every((line) => {
    const corners = [
      { xPt: line.xPt, yPt: line.baselineYPt - descenderHeightPt },
      {
        xPt: line.xPt + line.widthPt,
        yPt: line.baselineYPt - descenderHeightPt,
      },
      { xPt: line.xPt, yPt: line.baselineYPt + ascenderHeightPt },
      {
        xPt: line.xPt + line.widthPt,
        yPt: line.baselineYPt + ascenderHeightPt,
      },
    ]

    return corners.every((corner) => {
      const rotatedCorner = rotatePoint(
        corner,
        centerXPt,
        centerYPt,
        rotationRadians,
      )
      return isPointInsideBox(rotatedCorner, clipBoxPt)
    })
  })
}

function rotatePoint(
  point: { xPt: number; yPt: number },
  centerXPt: number,
  centerYPt: number,
  rotationRadians: number,
) {
  const relativeXPt = point.xPt - centerXPt
  const relativeYPt = point.yPt - centerYPt
  const cosine = Math.cos(rotationRadians)
  const sine = Math.sin(rotationRadians)

  return {
    xPt: centerXPt + relativeXPt * cosine - relativeYPt * sine,
    yPt: centerYPt + relativeXPt * sine + relativeYPt * cosine,
  }
}

function isPointInsideBox(
  point: { xPt: number; yPt: number },
  boxPt: PdfBoxPt,
): boolean {
  return (
    point.xPt >= boxPt.xPt - FIT_TOLERANCE_PT &&
    point.xPt <= boxPt.xPt + boxPt.widthPt + FIT_TOLERANCE_PT &&
    point.yPt >= boxPt.yPt - FIT_TOLERANCE_PT &&
    point.yPt <= boxPt.yPt + boxPt.heightPt + FIT_TOLERANCE_PT
  )
}

function wrapLines(
  sourceLines: string[],
  maximumWidthPt: number,
  fontSizePt: number,
  metrics: PdfFontMetrics,
): string[] {
  return sourceLines.flatMap((line) =>
    wrapLine(line, maximumWidthPt, fontSizePt, metrics),
  )
}

function wrapLine(
  sourceLine: string,
  maximumWidthPt: number,
  fontSizePt: number,
  metrics: PdfFontMetrics,
): string[] {
  if (sourceLine.length === 0) {
    return ['']
  }

  const tokens = sourceLine.match(/\s+|\S+/gu) ?? []
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const candidateLine = `${currentLine}${token}`

    if (
      currentLine.length === 0 ||
      metrics.measureTextWidthPt(candidateLine, fontSizePt) <= maximumWidthPt
    ) {
      currentLine = candidateLine
      continue
    }

    lines.push(currentLine.trimEnd())
    currentLine = token.trimStart()

    while (
      currentLine.length > 0 &&
      metrics.measureTextWidthPt(currentLine, fontSizePt) > maximumWidthPt
    ) {
      const [fittingPart, remainingPart] = splitTokenToWidth(
        currentLine,
        maximumWidthPt,
        fontSizePt,
        metrics,
      )
      lines.push(fittingPart)
      currentLine = remainingPart
    }
  }

  while (
    currentLine.length > 0 &&
    metrics.measureTextWidthPt(currentLine, fontSizePt) > maximumWidthPt
  ) {
    const [fittingPart, remainingPart] = splitTokenToWidth(
      currentLine,
      maximumWidthPt,
      fontSizePt,
      metrics,
    )
    lines.push(fittingPart)
    currentLine = remainingPart
  }

  if (currentLine.length > 0) {
    lines.push(currentLine.trimEnd())
  }

  return lines.length === 0 ? [''] : lines
}

function splitTokenToWidth(
  token: string,
  maximumWidthPt: number,
  fontSizePt: number,
  metrics: PdfFontMetrics,
): [string, string] {
  const characters = [...token]
  let fittingCharacterCount = 0

  for (let index = 1; index <= characters.length; index += 1) {
    const candidate = characters.slice(0, index).join('')

    if (metrics.measureTextWidthPt(candidate, fontSizePt) > maximumWidthPt) {
      break
    }

    fittingCharacterCount = index
  }

  if (fittingCharacterCount === 0) {
    fittingCharacterCount = 1
  }

  return [
    characters.slice(0, fittingCharacterCount).join(''),
    characters.slice(fittingCharacterCount).join(''),
  ]
}

function splitLines(text: string): string[] {
  return text.split(/\r\n?|\n/u)
}

function createOverflowFailure(message: string): PdfTextLayoutResult {
  return { status: 'error', code: 'PDF_TEXT_OVERFLOW', message }
}
