import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { DraftFieldAnnotation } from '../../domain/annotation-draft'
import type { NormalizedBox } from '../../domain/annotation-types'
import {
  createClampedPageSelection,
  hasMinimumScreenBoxSize,
  moveNormalizedBox,
  normalizePageSelection,
  resizeNormalizedBox,
  type ResizeHandle,
  type ScreenBoxPx,
  type ScreenPointPx,
  type SizePx,
} from '../../domain/coordinates'
import type { PdfTemplateDocument } from '../../pdf/pdf-document'
import type {
  EditorTool,
  PendingFieldTransform,
} from '../../state/editor-state'
import './PdfWorkspace.css'

interface PdfWorkspaceProps {
  document: PdfTemplateDocument
  pageNumber: number
  fields: DraftFieldAnnotation[]
  zoom: number
  activeTool: EditorTool
  selectedDraftId: string | null
  pendingSelection: ScreenBoxPx | null
  showDetectedFields: boolean
  onFieldSelected: (draftId: string | null) => void
  onPendingSelectionChanged: (selection: ScreenBoxPx | null) => void
  onPendingFieldTransformChanged: (
    transform: PendingFieldTransform | null,
  ) => void
  onManualFieldCreated: (box: NormalizedBox) => void
  onFieldBoxChanged: (draftId: string, box: NormalizedBox) => void
}

interface ActiveDrawInteraction {
  kind: 'draw'
  pointerId: number
  anchorPointPx: ScreenPointPx
  pageSizePx: SizePx
}

interface ActiveMoveInteraction {
  kind: 'move'
  pointerId: number
  draftId: string
  startPointPx: ScreenPointPx
  originalBox: NormalizedBox
  pageSizePx: SizePx
}

interface ActiveResizeInteraction extends Omit<ActiveMoveInteraction, 'kind'> {
  kind: 'resize'
  handle: ResizeHandle
}

type ActivePointerInteraction =
  | ActiveDrawInteraction
  | ActiveMoveInteraction
  | ActiveResizeInteraction

type RenderStatus = 'rendering' | 'ready' | 'error'

const MINIMUM_FIELD_SIZE_PX = 6
const RESIZE_HANDLES: ResizeHandle[] = [
  'north-west',
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
]

export function PdfWorkspace({
  document,
  pageNumber,
  fields,
  zoom,
  activeTool,
  selectedDraftId,
  pendingSelection,
  showDetectedFields,
  onFieldSelected,
  onPendingSelectionChanged,
  onPendingFieldTransformChanged,
  onManualFieldCreated,
  onFieldBoxChanged,
}: PdfWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activePointerRef = useRef<ActivePointerInteraction | null>(null)
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('rendering')
  const [renderErrorMessage, setRenderErrorMessage] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const canvas = canvasRef.current

    if (canvas === null) {
      return
    }

    let isCurrentRender = true
    setRenderStatus('rendering')
    setRenderErrorMessage(null)

    void document
      .renderPage({
        pageNumber,
        scale: zoom,
        outputScale: Math.max(window.devicePixelRatio, 1),
        canvas,
      })
      .then(() => {
        if (isCurrentRender) {
          setRenderStatus('ready')
        }
      })
      .catch((error: unknown) => {
        if (isCurrentRender) {
          setRenderStatus('error')
          setRenderErrorMessage(getRenderErrorMessage(error))
        }
      })

    return () => {
      isCurrentRender = false
    }
  }, [document, pageNumber, zoom])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (renderStatus !== 'ready' || event.button !== 0) {
      return
    }

    if (activeTool === 'select') {
      startFieldTransform(event)
      return
    }

    const pageBounds = event.currentTarget.getBoundingClientRect()
    const pageSizePx = {
      widthPx: pageBounds.width,
      heightPx: pageBounds.height,
    }
    const anchorPointPx = toPagePoint(event, pageBounds)

    activePointerRef.current = {
      kind: 'draw',
      pointerId: event.pointerId,
      anchorPointPx,
      pageSizePx,
    }
    capturePointer(event.currentTarget, event.pointerId)
    event.currentTarget.focus({ preventScroll: true })
    onPendingSelectionChanged(
      createSelectionBox(anchorPointPx, anchorPointPx, pageSizePx),
    )
    event.preventDefault()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activePointer = activePointerRef.current

    if (activePointer?.pointerId !== event.pointerId) {
      return
    }

    const currentPointPx = toPagePoint(
      event,
      event.currentTarget.getBoundingClientRect(),
    )
    if (activePointer.kind === 'draw') {
      onPendingSelectionChanged(
        createSelectionBox(
          activePointer.anchorPointPx,
          currentPointPx,
          activePointer.pageSizePx,
        ),
      )
      return
    }

    onPendingFieldTransformChanged({
      draftId: activePointer.draftId,
      box: transformFieldBox(activePointer, currentPointPx),
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activePointer = activePointerRef.current

    if (activePointer?.pointerId !== event.pointerId) {
      return
    }

    activePointerRef.current = null
    releasePointer(event.currentTarget, event.pointerId)

    const currentPointPx = toPagePoint(
      event,
      event.currentTarget.getBoundingClientRect(),
    )

    if (activePointer.kind === 'draw') {
      finishDrawing(activePointer, currentPointPx)
      return
    }

    const transformedBox = transformFieldBox(activePointer, currentPointPx)
    onPendingFieldTransformChanged(null)

    if (!areBoxesEqual(activePointer.originalBox, transformedBox)) {
      onFieldBoxChanged(activePointer.draftId, transformedBox)
    }
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current?.pointerId === event.pointerId) {
      cancelInteraction(event.currentTarget, event.pointerId)
    }
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || activePointerRef.current === null) {
      return
    }

    cancelInteraction(event.currentTarget, activePointerRef.current.pointerId)
  }

  const cancelInteraction = (
    pageElement: HTMLDivElement,
    pointerId: number,
  ) => {
    const activePointer = activePointerRef.current
    activePointerRef.current = null
    releasePointer(pageElement, pointerId)

    if (activePointer?.kind === 'draw') {
      onPendingSelectionChanged(null)
    } else {
      onPendingFieldTransformChanged(null)
    }
  }

  const startFieldTransform = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const draftId = getDraftIdFromTarget(event.target)
    onFieldSelected(draftId)

    if (draftId === null) {
      return
    }

    const field = fields.find((candidate) => candidate.draftId === draftId)

    if (field === undefined) {
      return
    }

    const pageBounds = event.currentTarget.getBoundingClientRect()
    const commonInteraction = {
      pointerId: event.pointerId,
      draftId,
      startPointPx: toPagePoint(event, pageBounds),
      originalBox: field.box,
      pageSizePx: {
        widthPx: pageBounds.width,
        heightPx: pageBounds.height,
      },
    }
    const resizeHandle = getResizeHandleFromTarget(event.target)

    activePointerRef.current =
      resizeHandle === null
        ? { kind: 'move', ...commonInteraction }
        : { kind: 'resize', handle: resizeHandle, ...commonInteraction }

    capturePointer(event.currentTarget, event.pointerId)
    event.currentTarget.focus({ preventScroll: true })
    event.preventDefault()
  }

  const finishDrawing = (
    activePointer: ActiveDrawInteraction,
    currentPointPx: ScreenPointPx,
  ) => {
    const selectionBoxPx = createSelectionBox(
      activePointer.anchorPointPx,
      currentPointPx,
      activePointer.pageSizePx,
    )
    onPendingSelectionChanged(null)

    if (hasMinimumScreenBoxSize(selectionBoxPx, MINIMUM_FIELD_SIZE_PX)) {
      onManualFieldCreated(
        normalizePageSelection(selectionBoxPx, activePointer.pageSizePx),
      )
    }
  }

  return (
    <div className="pdf-scroll-region">
      <div
        className={`pdf-page pdf-page--${activeTool}`}
        aria-label={`PDF page ${pageNumber} with ${fields.length} draft fields. ${activeTool === 'draw' ? 'Drag to draw a field. Press Escape to cancel.' : 'Select or drag a highlighted field. Use its handles to resize.'}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onLostPointerCapture={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <canvas ref={canvasRef} />

        {showDetectedFields && renderStatus === 'ready' ? (
          <div className="detected-field-layer" aria-hidden="true">
            {fields.map((field) => {
              const isSelected = field.draftId === selectedDraftId

              return (
                <span
                  className={`detected-field detected-field--${field.sourceFieldKind ?? field.origin} ${isSelected ? 'detected-field--selected' : ''}`}
                  data-draft-id={field.draftId}
                  key={field.draftId}
                  title={field.originalPdfFieldName ?? field.draftId}
                  style={{
                    left: `${field.box.x * 100}%`,
                    top: `${field.box.y * 100}%`,
                    width: `${field.box.width * 100}%`,
                    height: `${field.box.height * 100}%`,
                  }}
                >
                  {isSelected && activeTool === 'select'
                    ? RESIZE_HANDLES.map((handle) => (
                        <span
                          className={`field-resize-handle field-resize-handle--${handle}`}
                          data-draft-id={field.draftId}
                          data-resize-handle={handle}
                          key={handle}
                        />
                      ))
                    : null}
                </span>
              )
            })}
          </div>
        ) : null}

        {pendingSelection !== null && activeTool === 'draw' ? (
          <span
            className="pending-field-selection"
            aria-hidden="true"
            style={{
              left: `${pendingSelection.leftPx}px`,
              top: `${pendingSelection.topPx}px`,
              width: `${pendingSelection.widthPx}px`,
              height: `${pendingSelection.heightPx}px`,
            }}
          />
        ) : null}

        {renderStatus === 'rendering' ? (
          <div className="pdf-render-message" role="status">
            Rendering page {pageNumber}…
          </div>
        ) : null}

        {renderStatus === 'error' ? (
          <div className="pdf-render-message pdf-render-message--error" role="alert">
            {renderErrorMessage}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function createSelectionBox(
  anchorPointPx: ScreenPointPx,
  currentPointPx: ScreenPointPx,
  pageSizePx: SizePx,
): ScreenBoxPx {
  return createClampedPageSelection({
    anchorPointPx,
    currentPointPx,
    pageSizePx,
  })
}

function toPagePoint(
  event: ReactPointerEvent<HTMLDivElement>,
  pageBounds: DOMRect,
): ScreenPointPx {
  return {
    xPx: event.clientX - pageBounds.left,
    yPx: event.clientY - pageBounds.top,
  }
}

function getDraftIdFromTarget(target: EventTarget): string | null {
  if (!(target instanceof Element)) {
    return null
  }

  return target.closest<HTMLElement>('[data-draft-id]')?.dataset.draftId ?? null
}

function getResizeHandleFromTarget(target: EventTarget): ResizeHandle | null {
  if (!(target instanceof Element)) {
    return null
  }

  const handle = target.closest<HTMLElement>('[data-resize-handle]')?.dataset
    .resizeHandle

  return RESIZE_HANDLES.includes(handle as ResizeHandle)
    ? (handle as ResizeHandle)
    : null
}

function transformFieldBox(
  interaction: ActiveMoveInteraction | ActiveResizeInteraction,
  currentPointPx: ScreenPointPx,
): NormalizedBox {
  const deltaPx = {
    xPx: currentPointPx.xPx - interaction.startPointPx.xPx,
    yPx: currentPointPx.yPx - interaction.startPointPx.yPx,
  }

  if (interaction.kind === 'move') {
    return moveNormalizedBox({
      box: interaction.originalBox,
      deltaPx,
      pageSizePx: interaction.pageSizePx,
    })
  }

  return resizeNormalizedBox({
    box: interaction.originalBox,
    deltaPx,
    pageSizePx: interaction.pageSizePx,
    handle: interaction.handle,
    minimumSizePx: MINIMUM_FIELD_SIZE_PX,
  })
}

function areBoxesEqual(first: NormalizedBox, second: NormalizedBox): boolean {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height
  )
}

function capturePointer(element: HTMLElement, pointerId: number): void {
  if (typeof element.setPointerCapture === 'function') {
    element.setPointerCapture(pointerId)
  }
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  if (
    typeof element.hasPointerCapture === 'function' &&
    element.hasPointerCapture(pointerId)
  ) {
    element.releasePointerCapture(pointerId)
  }
}

function getRenderErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'This PDF page could not be rendered.'
}
