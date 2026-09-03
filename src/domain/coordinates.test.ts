import { describe, expect, it } from 'vitest'
import type { NormalizedBox } from './annotation-types'
import {
  createClampedPageSelection,
  hasMinimumScreenBoxSize,
  isNormalizedBoxWithinPage,
  moveNormalizedBox,
  normalizePageSelection,
  normalizeScreenBox,
  resizeNormalizedBox,
  toDisplayedBox,
  toPdfBox,
} from './coordinates'

describe('normalizeScreenBox', () => {
  it('converts an absolute screen selection to a normalized page box', () => {
    const box = normalizeScreenBox({
      pageBoxPx: {
        leftPx: 100,
        topPx: 50,
        widthPx: 1_224,
        heightPx: 1_584,
      },
      selectionBoxPx: {
        leftPx: 957,
        topPx: 684,
        widthPx: 245,
        heightPx: 48,
      },
    })

    expect(box.x).toBeCloseTo(0.7002, 4)
    expect(box.y).toBeCloseTo(0.4003, 4)
    expect(box.width).toBeCloseTo(0.2002, 4)
    expect(box.height).toBeCloseTo(0.0303, 4)
  })

  it('does not depend on where the page is positioned on the screen', () => {
    const firstBox = normalizeScreenBox({
      pageBoxPx: { leftPx: 0, topPx: 0, widthPx: 600, heightPx: 800 },
      selectionBoxPx: { leftPx: 300, topPx: 200, widthPx: 120, heightPx: 40 },
    })
    const movedPageBox = normalizeScreenBox({
      pageBoxPx: { leftPx: 80, topPx: 120, widthPx: 600, heightPx: 800 },
      selectionBoxPx: { leftPx: 380, topPx: 320, widthPx: 120, heightPx: 40 },
    })

    expect(movedPageBox).toEqual(firstBox)
  })

  it.each([
    ['page width', { leftPx: 0, topPx: 0, widthPx: 0, heightPx: 800 }],
    ['page height', { leftPx: 0, topPx: 0, widthPx: 600, heightPx: 0 }],
  ])('rejects a non-positive %s', (_caseName, pageBoxPx) => {
    expect(() =>
      normalizeScreenBox({
        pageBoxPx,
        selectionBoxPx: { leftPx: 0, topPx: 0, widthPx: 10, heightPx: 10 },
      }),
    ).toThrow(RangeError)
  })

  it('rejects a zero-area selection', () => {
    expect(() =>
      normalizeScreenBox({
        pageBoxPx: { leftPx: 0, topPx: 0, widthPx: 600, heightPx: 800 },
        selectionBoxPx: { leftPx: 10, topPx: 10, widthPx: 0, heightPx: 10 },
      }),
    ).toThrow('selectionBoxPx.widthPx must be finite and greater than zero.')
  })
})

describe('manual screen selections', () => {
  const pageSizePx = { widthPx: 600, heightPx: 800 }

  it('creates the same box when drawing forward or backward', () => {
    const forwardBox = createClampedPageSelection({
      anchorPointPx: { xPx: 60, yPx: 80 },
      currentPointPx: { xPx: 240, yPx: 160 },
      pageSizePx,
    })
    const backwardBox = createClampedPageSelection({
      anchorPointPx: { xPx: 240, yPx: 160 },
      currentPointPx: { xPx: 60, yPx: 80 },
      pageSizePx,
    })

    expect(forwardBox).toEqual({
      leftPx: 60,
      topPx: 80,
      widthPx: 180,
      heightPx: 80,
    })
    expect(backwardBox).toEqual(forwardBox)
  })

  it('clamps a selection to the visible page', () => {
    expect(
      createClampedPageSelection({
        anchorPointPx: { xPx: -20, yPx: 100 },
        currentPointPx: { xPx: 650, yPx: 900 },
        pageSizePx,
      }),
    ).toEqual({
      leftPx: 0,
      topPx: 100,
      widthPx: 600,
      heightPx: 700,
    })
  })

  it('normalizes a page-relative selection', () => {
    expect(
      normalizePageSelection(
        { leftPx: 60, topPx: 80, widthPx: 180, heightPx: 80 },
        pageSizePx,
      ),
    ).toEqual({ x: 0.1, y: 0.1, width: 0.3, height: 0.1 })
  })

  it('requires both dimensions to meet the minimum size', () => {
    expect(
      hasMinimumScreenBoxSize(
        { leftPx: 0, topPx: 0, widthPx: 6, heightPx: 6 },
        6,
      ),
    ).toBe(true)
    expect(
      hasMinimumScreenBoxSize(
        { leftPx: 0, topPx: 0, widthPx: 20, heightPx: 5 },
        6,
      ),
    ).toBe(false)
  })
})

describe('interactive box transforms', () => {
  const pageSizePx = { widthPx: 600, heightPx: 800 }
  const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.1 }

  it('moves a normalized box using a screen-pixel delta', () => {
    expectNormalizedBoxToBeClose(
      moveNormalizedBox({
        box,
        deltaPx: { xPx: 60, yPx: 80 },
        pageSizePx,
      }),
      { x: 0.2, y: 0.3, width: 0.3, height: 0.1 },
    )
  })

  it('clamps movement while preserving the box size', () => {
    expect(
      moveNormalizedBox({
        box,
        deltaPx: { xPx: 1_000, yPx: 1_000 },
        pageSizePx,
      }),
    ).toEqual({ x: 0.7, y: 0.9, width: 0.3, height: 0.1 })

    expect(
      moveNormalizedBox({
        box,
        deltaPx: { xPx: -1_000, yPx: -1_000 },
        pageSizePx,
      }),
    ).toEqual({ x: 0, y: 0, width: 0.3, height: 0.1 })
  })

  it('resizes the edges controlled by a corner handle', () => {
    expectNormalizedBoxToBeClose(
      resizeNormalizedBox({
        box,
        deltaPx: { xPx: 60, yPx: 80 },
        pageSizePx,
        handle: 'south-east',
        minimumSizePx: 6,
      }),
      { x: 0.1, y: 0.2, width: 0.4, height: 0.2 },
    )

    expectNormalizedBoxToBeClose(
      resizeNormalizedBox({
        box,
        deltaPx: { xPx: -60, yPx: -80 },
        pageSizePx,
        handle: 'north-west',
        minimumSizePx: 6,
      }),
      { x: 0, y: 0.1, width: 0.4, height: 0.2 },
    )
  })

  it('enforces the minimum display size and page boundaries', () => {
    const minimumWidthBox = resizeNormalizedBox({
      box,
      deltaPx: { xPx: -1_000, yPx: 0 },
      pageSizePx,
      handle: 'east',
      minimumSizePx: 6,
    })
    const pageBoundaryBox = resizeNormalizedBox({
      box,
      deltaPx: { xPx: 1_000, yPx: 1_000 },
      pageSizePx,
      handle: 'south-east',
      minimumSizePx: 6,
    })

    expect(minimumWidthBox.width).toBeCloseTo(0.01)
    expect(minimumWidthBox.x).toBe(0.1)
    expect(pageBoundaryBox).toEqual({
      x: 0.1,
      y: 0.2,
      width: 0.9,
      height: 0.8,
    })
  })
})

describe('toDisplayedBox', () => {
  it('restores a box relative to the displayed page', () => {
    const displayedBox = toDisplayedBox(
      { x: 0.7002, y: 0.4003, width: 0.2002, height: 0.0303 },
      { widthPx: 1_224, heightPx: 1_584 },
    )

    expect(displayedBox.leftPx).toBeCloseTo(857, 0)
    expect(displayedBox.topPx).toBeCloseTo(634, 0)
    expect(displayedBox.widthPx).toBeCloseTo(245, 0)
    expect(displayedBox.heightPx).toBeCloseTo(48, 0)
  })

  it('keeps the annotation aligned when the displayed page is zoomed', () => {
    const box: NormalizedBox = { x: 0.5, y: 0.25, width: 0.2, height: 0.1 }

    expect(toDisplayedBox(box, { widthPx: 1_200, heightPx: 1_600 })).toEqual({
      leftPx: 600,
      topPx: 400,
      widthPx: 240,
      heightPx: 160,
    })
  })

  it('rejects a non-finite normalized coordinate', () => {
    expect(() =>
      toDisplayedBox(
        { x: Number.NaN, y: 0, width: 0.1, height: 0.1 },
        { widthPx: 600, heightPx: 800 },
      ),
    ).toThrow('box.x must be finite.')
  })
})

describe('toPdfBox', () => {
  it('converts a top-left normalized box to bottom-left PDF points', () => {
    const pdfBox = toPdfBox(
      { x: 0.7, y: 0.4, width: 0.2, height: 0.03 },
      { widthPt: 612, heightPt: 792 },
    )

    expect(pdfBox.xPt).toBeCloseTo(428.4)
    expect(pdfBox.yPt).toBeCloseTo(451.44)
    expect(pdfBox.widthPt).toBeCloseTo(122.4)
    expect(pdfBox.heightPt).toBeCloseTo(23.76)
  })

  it('places a box touching the page bottom at zero PDF y', () => {
    const pdfBox = toPdfBox(
      { x: 0.75, y: 0.9, width: 0.25, height: 0.1 },
      { widthPt: 612, heightPt: 792 },
    )

    expect(pdfBox.yPt).toBeCloseTo(0)
  })

  it('rejects a non-positive PDF page size', () => {
    expect(() =>
      toPdfBox(
        { x: 0, y: 0, width: 0.1, height: 0.1 },
        { widthPt: -612, heightPt: 792 },
      ),
    ).toThrow('pageSizePt.widthPt must be finite and greater than zero.')
  })
})

describe('isNormalizedBoxWithinPage', () => {
  it.each([
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 0.75, y: 0.9, width: 0.25, height: 0.1 },
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  ])('accepts a box contained by the page', (box) => {
    expect(isNormalizedBoxWithinPage(box)).toBe(true)
  })

  it.each([
    { x: -0.1, y: 0, width: 0.1, height: 0.1 },
    { x: 0, y: -0.1, width: 0.1, height: 0.1 },
    { x: 0, y: 0, width: 0, height: 0.1 },
    { x: 0, y: 0, width: 0.1, height: 0 },
    { x: 0.9, y: 0, width: 0.2, height: 0.1 },
    { x: 0, y: 0.9, width: 0.1, height: 0.2 },
    { x: Number.NaN, y: 0, width: 0.1, height: 0.1 },
    { x: 0, y: Number.POSITIVE_INFINITY, width: 0.1, height: 0.1 },
  ])('rejects a box outside the normalized page', (box) => {
    expect(isNormalizedBoxWithinPage(box)).toBe(false)
  })
})

function expectNormalizedBoxToBeClose(
  actual: NormalizedBox,
  expected: NormalizedBox,
): void {
  expect(actual.x).toBeCloseTo(expected.x)
  expect(actual.y).toBeCloseTo(expected.y)
  expect(actual.width).toBeCloseTo(expected.width)
  expect(actual.height).toBeCloseTo(expected.height)
}
