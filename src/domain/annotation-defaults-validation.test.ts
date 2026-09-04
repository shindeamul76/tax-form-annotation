import { describe, expect, it } from 'vitest'
import type { AnnotationDefaults } from './annotation-types'
import { validateAnnotationDefaults } from './annotation-defaults-validation'

const validDefaults: AnnotationDefaults = {
  style: {
    fontFamily: 'Helvetica',
    fontSizePt: 9,
    minimumFontSizePt: 6,
    horizontalAlign: 'left',
    verticalAlign: 'middle',
    paddingPt: 1,
    color: '#000000',
    overflow: 'shrink',
    rotationDegrees: 0,
    lineHeight: 1.2,
  },
  behavior: {
    onMissing: 'warn',
    onNull: 'blank',
    printZero: false,
  },
}

describe('validateAnnotationDefaults', () => {
  it('accepts complete rendering defaults', () => {
    expect(validateAnnotationDefaults(validDefaults)).toEqual([])
  })

  it('reports invalid style values and incompatible font sizes', () => {
    const diagnostics = validateAnnotationDefaults({
      ...validDefaults,
      style: {
        ...validDefaults.style,
        fontFamily: ' ',
        fontSizePt: 0,
        minimumFontSizePt: 12,
        paddingPt: -1,
        color: 'black',
        rotationDegrees: 361,
        lineHeight: 0,
      },
    })

    expect(diagnostics.map(({ path }) => path)).toEqual([
      '/defaults/style/fontFamily',
      '/defaults/style/fontSizePt',
      '/defaults/style/minimumFontSizePt',
      '/defaults/style/paddingPt',
      '/defaults/style/color',
      '/defaults/style/rotationDegrees',
      '/defaults/style/lineHeight',
    ])
  })
})
