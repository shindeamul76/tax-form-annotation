import type { NormalizedBox } from './annotation-types'

export interface ScreenBoxPx {
  leftPx: number
  topPx: number
  widthPx: number
  heightPx: number
}

export interface ScreenPointPx {
  xPx: number
  yPx: number
}

export type ResizeHandle =
  | 'north-west'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'

export interface PageSelectionInput {
  anchorPointPx: ScreenPointPx
  currentPointPx: ScreenPointPx
  pageSizePx: SizePx
}

export interface ScreenBoxConversion {
  pageBoxPx: ScreenBoxPx
  selectionBoxPx: ScreenBoxPx
}

export interface SizePx {
  widthPx: number
  heightPx: number
}

export interface DisplayedBoxPx {
  leftPx: number
  topPx: number
  widthPx: number
  heightPx: number
}

export interface SizePt {
  widthPt: number
  heightPt: number
}

interface MoveNormalizedBoxInput {
  box: NormalizedBox
  deltaPx: ScreenPointPx
  pageSizePx: SizePx
}

interface ResizeNormalizedBoxInput extends MoveNormalizedBoxInput {
  handle: ResizeHandle
  minimumSizePx: number
}

export interface PdfBoxPt {
  xPt: number
  yPt: number
  widthPt: number
  heightPt: number
}

export function normalizeScreenBox({
  pageBoxPx,
  selectionBoxPx,
}: ScreenBoxConversion): NormalizedBox {
  assertFinitePosition(pageBoxPx, 'pageBoxPx')
  assertPositiveSize(pageBoxPx, 'pageBoxPx')
  assertFinitePosition(selectionBoxPx, 'selectionBoxPx')
  assertPositiveSize(selectionBoxPx, 'selectionBoxPx')

  return {
    x: (selectionBoxPx.leftPx - pageBoxPx.leftPx) / pageBoxPx.widthPx,
    y: (selectionBoxPx.topPx - pageBoxPx.topPx) / pageBoxPx.heightPx,
    width: selectionBoxPx.widthPx / pageBoxPx.widthPx,
    height: selectionBoxPx.heightPx / pageBoxPx.heightPx,
  }
}

export function createClampedPageSelection({
  anchorPointPx,
  currentPointPx,
  pageSizePx,
}: PageSelectionInput): ScreenBoxPx {
  assertFinitePoint(anchorPointPx, 'anchorPointPx')
  assertFinitePoint(currentPointPx, 'currentPointPx')
  assertPositiveNumber(pageSizePx.widthPx, 'pageSizePx.widthPx')
  assertPositiveNumber(pageSizePx.heightPx, 'pageSizePx.heightPx')

  const anchorXPx = clamp(anchorPointPx.xPx, 0, pageSizePx.widthPx)
  const anchorYPx = clamp(anchorPointPx.yPx, 0, pageSizePx.heightPx)
  const currentXPx = clamp(currentPointPx.xPx, 0, pageSizePx.widthPx)
  const currentYPx = clamp(currentPointPx.yPx, 0, pageSizePx.heightPx)

  return {
    leftPx: Math.min(anchorXPx, currentXPx),
    topPx: Math.min(anchorYPx, currentYPx),
    widthPx: Math.abs(currentXPx - anchorXPx),
    heightPx: Math.abs(currentYPx - anchorYPx),
  }
}

export function normalizePageSelection(
  selectionBoxPx: ScreenBoxPx,
  pageSizePx: SizePx,
): NormalizedBox {
  return normalizeScreenBox({
    pageBoxPx: {
      leftPx: 0,
      topPx: 0,
      widthPx: pageSizePx.widthPx,
      heightPx: pageSizePx.heightPx,
    },
    selectionBoxPx,
  })
}

export function hasMinimumScreenBoxSize(
  box: ScreenBoxPx,
  minimumSizePx: number,
): boolean {
  assertFinitePosition(box, 'box')
  assertFiniteNumber(box.widthPx, 'box.widthPx')
  assertFiniteNumber(box.heightPx, 'box.heightPx')
  assertPositiveNumber(minimumSizePx, 'minimumSizePx')

  return box.widthPx >= minimumSizePx && box.heightPx >= minimumSizePx
}

export function moveNormalizedBox({
  box,
  deltaPx,
  pageSizePx,
}: MoveNormalizedBoxInput): NormalizedBox {
  assertNormalizedBoxWithinPage(box)
  assertFinitePoint(deltaPx, 'deltaPx')
  assertPositivePageSize(pageSizePx)

  return {
    ...box,
    x: clamp(box.x + deltaPx.xPx / pageSizePx.widthPx, 0, 1 - box.width),
    y: clamp(
      box.y + deltaPx.yPx / pageSizePx.heightPx,
      0,
      1 - box.height,
    ),
  }
}

export function resizeNormalizedBox({
  box,
  deltaPx,
  pageSizePx,
  handle,
  minimumSizePx,
}: ResizeNormalizedBoxInput): NormalizedBox {
  assertNormalizedBoxWithinPage(box)
  assertFinitePoint(deltaPx, 'deltaPx')
  assertPositivePageSize(pageSizePx)
  assertPositiveNumber(minimumSizePx, 'minimumSizePx')

  const deltaX = deltaPx.xPx / pageSizePx.widthPx
  const deltaY = deltaPx.yPx / pageSizePx.heightPx
  const minimumWidth = Math.min(
    box.width,
    minimumSizePx / pageSizePx.widthPx,
  )
  const minimumHeight = Math.min(
    box.height,
    minimumSizePx / pageSizePx.heightPx,
  )
  let left = box.x
  let top = box.y
  let right = box.x + box.width
  let bottom = box.y + box.height

  if (handleIncludesWest(handle)) {
    left = clamp(left + deltaX, 0, right - minimumWidth)
  }

  if (handleIncludesEast(handle)) {
    right = clamp(right + deltaX, left + minimumWidth, 1)
  }

  if (handleIncludesNorth(handle)) {
    top = clamp(top + deltaY, 0, bottom - minimumHeight)
  }

  if (handleIncludesSouth(handle)) {
    bottom = clamp(bottom + deltaY, top + minimumHeight, 1)
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function toDisplayedBox(
  box: NormalizedBox,
  pageSizePx: SizePx,
): DisplayedBoxPx {
  assertFiniteNormalizedBox(box)
  assertPositiveNumber(pageSizePx.widthPx, 'pageSizePx.widthPx')
  assertPositiveNumber(pageSizePx.heightPx, 'pageSizePx.heightPx')

  return {
    leftPx: box.x * pageSizePx.widthPx,
    topPx: box.y * pageSizePx.heightPx,
    widthPx: box.width * pageSizePx.widthPx,
    heightPx: box.height * pageSizePx.heightPx,
  }
}

export function toPdfBox(box: NormalizedBox, pageSizePt: SizePt): PdfBoxPt {
  assertFiniteNormalizedBox(box)
  assertPositiveNumber(pageSizePt.widthPt, 'pageSizePt.widthPt')
  assertPositiveNumber(pageSizePt.heightPt, 'pageSizePt.heightPt')

  // Version 1 targets unrotated PDF pages whose coordinate origin is bottom-left.
  return {
    xPt: box.x * pageSizePt.widthPt,
    yPt: (1 - box.y - box.height) * pageSizePt.heightPt,
    widthPt: box.width * pageSizePt.widthPt,
    heightPt: box.height * pageSizePt.heightPt,
  }
}

export function isNormalizedBoxWithinPage(box: NormalizedBox): boolean {
  return (
    areFinite(box.x, box.y, box.width, box.height) &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.width > 0 &&
    box.height > 0 &&
    box.x + box.width <= 1 &&
    box.y + box.height <= 1
  )
}

function assertFinitePosition(box: ScreenBoxPx, propertyName: string): void {
  assertFiniteNumber(box.leftPx, `${propertyName}.leftPx`)
  assertFiniteNumber(box.topPx, `${propertyName}.topPx`)
}

function assertFinitePoint(point: ScreenPointPx, propertyName: string): void {
  assertFiniteNumber(point.xPx, `${propertyName}.xPx`)
  assertFiniteNumber(point.yPx, `${propertyName}.yPx`)
}

function assertPositiveSize(box: ScreenBoxPx, propertyName: string): void {
  assertPositiveNumber(box.widthPx, `${propertyName}.widthPx`)
  assertPositiveNumber(box.heightPx, `${propertyName}.heightPx`)
}

function assertFiniteNormalizedBox(box: NormalizedBox): void {
  assertFiniteNumber(box.x, 'box.x')
  assertFiniteNumber(box.y, 'box.y')
  assertFiniteNumber(box.width, 'box.width')
  assertFiniteNumber(box.height, 'box.height')
}

function assertNormalizedBoxWithinPage(box: NormalizedBox): void {
  if (!isNormalizedBoxWithinPage(box)) {
    throw new RangeError('box must be contained by the normalized page.')
  }
}

function assertPositivePageSize(pageSizePx: SizePx): void {
  assertPositiveNumber(pageSizePx.widthPx, 'pageSizePx.widthPx')
  assertPositiveNumber(pageSizePx.heightPx, 'pageSizePx.heightPx')
}

function assertFiniteNumber(value: number, propertyName: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${propertyName} must be finite.`)
  }
}

function assertPositiveNumber(value: number, propertyName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${propertyName} must be finite and greater than zero.`)
  }
}

function areFinite(...values: number[]): boolean {
  return values.every(Number.isFinite)
}

function handleIncludesWest(handle: ResizeHandle): boolean {
  return handle === 'west' || handle.endsWith('-west')
}

function handleIncludesEast(handle: ResizeHandle): boolean {
  return handle === 'east' || handle.endsWith('-east')
}

function handleIncludesNorth(handle: ResizeHandle): boolean {
  return handle === 'north' || handle.startsWith('north-')
}

function handleIncludesSouth(handle: ResizeHandle): boolean {
  return handle === 'south' || handle.startsWith('south-')
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
