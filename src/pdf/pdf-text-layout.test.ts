import { describe, expect, it } from 'vitest'
import type { FieldStyle } from '../domain/annotation-types'
import { layoutPdfText, type PdfFontMetrics } from './pdf-text-layout'

const metrics: PdfFontMetrics = {
  measureTextWidthPt: (text, fontSizePt) =>
    [...text].length * fontSizePt * 0.5,
  measureFontHeightPt: (fontSizePt) => fontSizePt,
  measureFontAscenderHeightPt: (fontSizePt) => fontSizePt * 0.8,
}

const defaultStyle: FieldStyle = {
  fontFamily: 'Helvetica',
  fontSizePt: 10,
  minimumFontSizePt: 5,
  horizontalAlign: 'left',
  verticalAlign: 'middle',
  paddingPt: 0,
  color: '#000000',
  overflow: 'error',
  rotationDegrees: 0,
  lineHeight: 1.2,
}

describe('layoutPdfText', () => {
  it('positions a line using horizontal and vertical alignment', () => {
    const result = layoutPdfText({
      text: '1234',
      boxPt: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 20 },
      style: {
        ...defaultStyle,
        horizontalAlign: 'right',
        verticalAlign: 'middle',
      },
      metrics,
    })

    expect(result).toEqual({
      status: 'ready',
      layout: {
        fontSizePt: 10,
        clipBoxPt: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 20 },
        lines: [
          { text: '1234', widthPt: 20, xPt: 80, baselineYPt: 7 },
        ],
      },
    })
  })

  it('finds the largest fitting font size for shrink overflow', () => {
    const result = layoutPdfText({
      text: '12345678901234567890',
      boxPt: { xPt: 0, yPt: 0, widthPt: 60, heightPt: 20 },
      style: { ...defaultStyle, overflow: 'shrink' },
      metrics,
    })

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.layout.fontSizePt).toBeCloseTo(6, 4)
      expect(result.layout.lines[0]?.widthPt).toBeCloseTo(60, 3)
    }
  })

  it('fails shrink when text cannot fit at the minimum font size', () => {
    const result = layoutPdfText({
      text: '12345678901234567890',
      boxPt: { xPt: 0, yPt: 0, widthPt: 60, heightPt: 20 },
      style: {
        ...defaultStyle,
        minimumFontSizePt: 8,
        overflow: 'shrink',
      },
      metrics,
    })

    expect(result).toMatchObject({
      status: 'error',
      code: 'PDF_TEXT_OVERFLOW',
    })
  })

  it('wraps text without exceeding the declared line limit', () => {
    const result = layoutPdfText({
      text: 'Alpha beta',
      boxPt: { xPt: 0, yPt: 0, widthPt: 30, heightPt: 30 },
      style: { ...defaultStyle, overflow: 'wrap' },
      maximumLines: 2,
      metrics,
    })

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.layout.lines.map(({ text }) => text)).toEqual([
        'Alpha',
        'beta',
      ])
    }
  })

  it('fails wrap when the declared line limit is exceeded', () => {
    const result = layoutPdfText({
      text: 'Alpha beta',
      boxPt: { xPt: 0, yPt: 0, widthPt: 30, heightPt: 30 },
      style: { ...defaultStyle, overflow: 'wrap' },
      maximumLines: 1,
      metrics,
    })

    expect(result).toMatchObject({
      status: 'error',
      message: 'The value requires 2 lines but the field permits 1.',
    })
  })

  it('clips overlong content and respects the maximum line count', () => {
    const result = layoutPdfText({
      text: 'First\nSecond\nThird',
      boxPt: { xPt: 0, yPt: 0, widthPt: 20, heightPt: 10 },
      style: { ...defaultStyle, overflow: 'clip' },
      maximumLines: 2,
      metrics,
    })

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.layout.lines.map(({ text }) => text)).toEqual([
        'First',
        'Second',
      ])
    }
  })

  it('rejects padding that removes the printable area', () => {
    const result = layoutPdfText({
      text: 'Value',
      boxPt: { xPt: 0, yPt: 0, widthPt: 10, heightPt: 10 },
      style: { ...defaultStyle, paddingPt: 5 },
      metrics,
    })

    expect(result).toMatchObject({
      status: 'error',
      message: 'Field padding leaves no printable area.',
    })
  })

  it('accounts for clockwise rotation while checking field bounds', () => {
    const result = layoutPdfText({
      text: '1234',
      boxPt: { xPt: 0, yPt: 0, widthPt: 30, heightPt: 30 },
      style: {
        ...defaultStyle,
        horizontalAlign: 'center',
        rotationDegrees: 90,
      },
      metrics,
    })

    expect(result.status).toBe('ready')
  })
})

describe('layoutPdfText comb fields', () => {
  it('centers one character in each comb cell', () => {
    const result = layoutPdfText({
      text: '123456789',
      boxPt: { xPt: 0, yPt: 0, widthPt: 90, heightPt: 20 },
      style: { ...defaultStyle, characterCells: 9 },
      metrics,
    })

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      return
    }

    // Each cell is 10pt wide and each glyph is 5pt, so glyphs start at 2.5pt
    // into their own cell and advance one full cell at a time.
    expect(result.layout.lines).toEqual([
      { text: '1', widthPt: 5, xPt: 2.5, baselineYPt: 7 },
      { text: '2', widthPt: 5, xPt: 12.5, baselineYPt: 7 },
      { text: '3', widthPt: 5, xPt: 22.5, baselineYPt: 7 },
      { text: '4', widthPt: 5, xPt: 32.5, baselineYPt: 7 },
      { text: '5', widthPt: 5, xPt: 42.5, baselineYPt: 7 },
      { text: '6', widthPt: 5, xPt: 52.5, baselineYPt: 7 },
      { text: '7', widthPt: 5, xPt: 62.5, baselineYPt: 7 },
      { text: '8', widthPt: 5, xPt: 72.5, baselineYPt: 7 },
      { text: '9', widthPt: 5, xPt: 82.5, baselineYPt: 7 },
    ])
  })

  it('ignores horizontal alignment because cells fix each position', () => {
    const centered = layoutPdfText({
      text: '12',
      boxPt: { xPt: 0, yPt: 0, widthPt: 40, heightPt: 20 },
      style: { ...defaultStyle, characterCells: 4, horizontalAlign: 'center' },
      metrics,
    })
    const rightAligned = layoutPdfText({
      text: '12',
      boxPt: { xPt: 0, yPt: 0, widthPt: 40, heightPt: 20 },
      style: { ...defaultStyle, characterCells: 4, horizontalAlign: 'right' },
      metrics,
    })

    expect(centered).toEqual(rightAligned)
  })

  it('reports overflow when the value has more characters than cells', () => {
    const result = layoutPdfText({
      text: '000-00-0000',
      boxPt: { xPt: 0, yPt: 0, widthPt: 90, heightPt: 20 },
      style: { ...defaultStyle, characterCells: 9 },
      metrics,
    })

    expect(result).toEqual({
      status: 'error',
      code: 'PDF_TEXT_OVERFLOW',
      message:
        'The value has 11 characters but the field provides 9 comb cells.',
    })
  })

  it('shrinks to fit a narrow cell when the overflow behavior allows it', () => {
    const result = layoutPdfText({
      text: '12345',
      boxPt: { xPt: 0, yPt: 0, widthPt: 20, heightPt: 20 },
      style: { ...defaultStyle, characterCells: 5, overflow: 'shrink' },
      metrics,
    })

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      return
    }

    // Cells are 4pt wide, so a 10pt glyph at 5pt wide has to come down.
    expect(result.layout.fontSizePt).toBeLessThan(10)
    expect(result.layout.fontSizePt).toBeGreaterThanOrEqual(5)
    for (const line of result.layout.lines) {
      expect(line.widthPt).toBeLessThanOrEqual(4.0001)
    }
  })

  it('fails instead of overlapping cells when shrinking is not permitted', () => {
    const result = layoutPdfText({
      text: '12345',
      boxPt: { xPt: 0, yPt: 0, widthPt: 20, heightPt: 20 },
      style: { ...defaultStyle, characterCells: 5, overflow: 'error' },
      metrics,
    })

    expect(result.status).toBe('error')
  })
})
