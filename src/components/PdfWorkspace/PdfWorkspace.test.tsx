import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DraftFieldAnnotation } from '../../domain/annotation-draft'
import type { NormalizedBox } from '../../domain/annotation-types'
import type { PdfTemplateDocument } from '../../pdf/pdf-document'
import type { PendingFieldTransform } from '../../state/editor-state'
import { PdfWorkspace } from './PdfWorkspace'

const field: DraftFieldAnnotation = {
  draftId: 'acroform:1:field-1',
  origin: 'acroform',
  originalPdfFieldName: 'pdf.field.1',
  sourceFieldKind: 'text',
  mappingStatus: 'unmapped',
  page: 1,
  box: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
}

describe('PdfWorkspace', () => {
  it('renders a page using canonical zoom and displays selected draft boxes', async () => {
    const renderPage = vi.fn(() =>
      Promise.resolve({ widthPx: 765, heightPx: 990, rotationDegrees: 0 }),
    )
    const onFieldSelected = vi.fn()
    const pdfDocument = createPdfDocument(renderPage)
    const { container } = render(
      <PdfWorkspace
        document={pdfDocument}
        pageNumber={1}
        fields={[field]}
        zoom={1.25}
        activeTool="select"
        selectedDraftId={field.draftId}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={onFieldSelected}
        onPendingSelectionChanged={vi.fn()}
        onPendingFieldTransformChanged={vi.fn()}
        onManualFieldCreated={vi.fn()}
        onFieldBoxChanged={vi.fn()}
      />,
    )

    await waitFor(() => expect(renderPage).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(container.querySelector('.detected-field')).toBeInTheDocument(),
    )

    expect(renderPage).toHaveBeenCalledWith(
      expect.objectContaining({ pageNumber: 1, scale: 1.25 }),
    )
    const fieldOverlay = container.querySelector('.detected-field')
    expect(fieldOverlay).toHaveClass('detected-field--selected')
    expect(container.querySelectorAll('.field-resize-handle')).toHaveLength(8)

    if (fieldOverlay === null) {
      throw new Error('Expected the field overlay to exist.')
    }

    fireEvent.pointerDown(fieldOverlay)
    expect(onFieldSelected).toHaveBeenCalledWith(field.draftId)
  })

  it('shows an actionable adapter error', async () => {
    const pdfDocument = createPdfDocument(() =>
      Promise.reject(new Error('PDF page 1 could not be rendered.')),
    )

    render(
      <PdfWorkspace
        document={pdfDocument}
        pageNumber={1}
        fields={[]}
        zoom={1}
        activeTool="select"
        selectedDraftId={null}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={vi.fn()}
        onPendingSelectionChanged={vi.fn()}
        onPendingFieldTransformChanged={vi.fn()}
        onManualFieldCreated={vi.fn()}
        onFieldBoxChanged={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'PDF page 1 could not be rendered.',
    )
  })

  it('converts a pointer drag into a normalized manual field box', async () => {
    const onPendingSelectionChanged = vi.fn()
    const onManualFieldCreated = vi.fn()
    const { container } = render(
      <PdfWorkspace
        document={createPdfDocument(() =>
          Promise.resolve({
            widthPx: 600,
            heightPx: 800,
            rotationDegrees: 0,
          }),
        )}
        pageNumber={1}
        fields={[]}
        zoom={1}
        activeTool="draw"
        selectedDraftId={null}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={vi.fn()}
        onPendingSelectionChanged={onPendingSelectionChanged}
        onPendingFieldTransformChanged={vi.fn()}
        onManualFieldCreated={onManualFieldCreated}
        onFieldBoxChanged={vi.fn()}
      />,
    )
    const pageElement = container.querySelector<HTMLDivElement>('.pdf-page')
    expect(pageElement).not.toBeNull()

    mockPageBounds(pageElement)
    await screen.findByLabelText(/Drag to draw a field/)

    fireEvent.pointerDown(pageElement, {
      pointerId: 7,
      button: 0,
      clientX: 160,
      clientY: 130,
    })
    fireEvent.pointerMove(pageElement, {
      pointerId: 7,
      clientX: 340,
      clientY: 210,
    })
    fireEvent.pointerUp(pageElement, {
      pointerId: 7,
      button: 0,
      clientX: 340,
      clientY: 210,
    })

    expect(onPendingSelectionChanged).toHaveBeenCalledWith({
      leftPx: 60,
      topPx: 80,
      widthPx: 180,
      heightPx: 80,
    })
    expect(onPendingSelectionChanged).toHaveBeenLastCalledWith(null)
    expect(onManualFieldCreated).toHaveBeenCalledWith({
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.1,
    })
  })

  it('cancels an active pointer selection with Escape', async () => {
    const onPendingSelectionChanged = vi.fn()
    const onManualFieldCreated = vi.fn()
    const { container } = render(
      <PdfWorkspace
        document={createPdfDocument(() =>
          Promise.resolve({
            widthPx: 600,
            heightPx: 800,
            rotationDegrees: 0,
          }),
        )}
        pageNumber={1}
        fields={[]}
        zoom={1}
        activeTool="draw"
        selectedDraftId={null}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={vi.fn()}
        onPendingSelectionChanged={onPendingSelectionChanged}
        onPendingFieldTransformChanged={vi.fn()}
        onManualFieldCreated={onManualFieldCreated}
        onFieldBoxChanged={vi.fn()}
      />,
    )
    const pageElement = container.querySelector<HTMLDivElement>('.pdf-page')
    expect(pageElement).not.toBeNull()

    mockPageBounds(pageElement)
    await screen.findByLabelText(/Drag to draw a field/)
    fireEvent.pointerDown(pageElement, {
      pointerId: 8,
      button: 0,
      clientX: 160,
      clientY: 130,
    })
    fireEvent.keyDown(pageElement, { key: 'Escape' })

    expect(onPendingSelectionChanged).toHaveBeenLastCalledWith(null)
    expect(onManualFieldCreated).not.toHaveBeenCalled()
  })

  it('previews and commits movement of a selected field', async () => {
    const onPendingFieldTransformChanged = vi.fn<
      (transform: PendingFieldTransform | null) => void
    >()
    const onFieldBoxChanged = vi.fn<
      (draftId: string, box: NormalizedBox) => void
    >()
    const { container } = render(
      <PdfWorkspace
        document={createReadyPdfDocument()}
        pageNumber={1}
        fields={[field]}
        zoom={1}
        activeTool="select"
        selectedDraftId={field.draftId}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={vi.fn()}
        onPendingSelectionChanged={vi.fn()}
        onPendingFieldTransformChanged={onPendingFieldTransformChanged}
        onManualFieldCreated={vi.fn()}
        onFieldBoxChanged={onFieldBoxChanged}
      />,
    )
    const pageElement = container.querySelector<HTMLDivElement>('.pdf-page')
    mockPageBounds(pageElement)
    const fieldOverlay = await waitFor(() => {
      const overlay = container.querySelector<HTMLElement>('.detected-field')
      expect(overlay).not.toBeNull()
      return overlay!
    })

    fireEvent.pointerDown(fieldOverlay, {
      pointerId: 9,
      button: 0,
      clientX: 160,
      clientY: 130,
    })
    fireEvent.pointerMove(pageElement, {
      pointerId: 9,
      clientX: 220,
      clientY: 210,
    })
    fireEvent.pointerUp(pageElement, {
      pointerId: 9,
      button: 0,
      clientX: 220,
      clientY: 210,
    })

    const movedBox = { x: 0.2, y: 0.3, width: 0.3, height: 0.04 }
    const pendingTransform = onPendingFieldTransformChanged.mock.calls[0]?.[0]
    expect(pendingTransform?.draftId).toBe(field.draftId)
    expectBoxToBeClose(pendingTransform?.box, movedBox)
    expect(onPendingFieldTransformChanged).toHaveBeenLastCalledWith(null)
    expect(onFieldBoxChanged.mock.calls[0]?.[0]).toBe(field.draftId)
    expectBoxToBeClose(onFieldBoxChanged.mock.calls[0]?.[1], movedBox)
  })

  it('resizes a selected field from its south-east handle', async () => {
    const onPendingFieldTransformChanged = vi.fn<
      (transform: PendingFieldTransform | null) => void
    >()
    const onFieldBoxChanged = vi.fn<
      (draftId: string, box: NormalizedBox) => void
    >()
    const { container } = render(
      <PdfWorkspace
        document={createReadyPdfDocument()}
        pageNumber={1}
        fields={[field]}
        zoom={1}
        activeTool="select"
        selectedDraftId={field.draftId}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={vi.fn()}
        onPendingSelectionChanged={vi.fn()}
        onPendingFieldTransformChanged={onPendingFieldTransformChanged}
        onManualFieldCreated={vi.fn()}
        onFieldBoxChanged={onFieldBoxChanged}
      />,
    )
    const pageElement = container.querySelector<HTMLDivElement>('.pdf-page')
    mockPageBounds(pageElement)
    const resizeHandle = await waitFor(() => {
      const handle = container.querySelector<HTMLElement>(
        '[data-resize-handle="south-east"]',
      )
      expect(handle).not.toBeNull()
      return handle!
    })

    fireEvent.pointerDown(resizeHandle, {
      pointerId: 10,
      button: 0,
      clientX: 340,
      clientY: 242,
    })
    fireEvent.pointerMove(pageElement, {
      pointerId: 10,
      clientX: 400,
      clientY: 282,
    })
    fireEvent.pointerUp(pageElement, {
      pointerId: 10,
      button: 0,
      clientX: 400,
      clientY: 282,
    })

    const resizedBox = { x: 0.1, y: 0.2, width: 0.4, height: 0.09 }
    const pendingTransform = onPendingFieldTransformChanged.mock.calls[0]?.[0]
    expect(pendingTransform?.draftId).toBe(field.draftId)
    expectBoxToBeClose(pendingTransform?.box, resizedBox)
    expect(onFieldBoxChanged.mock.calls[0]?.[0]).toBe(field.draftId)
    expectBoxToBeClose(onFieldBoxChanged.mock.calls[0]?.[1], resizedBox)
  })

  it('cancels an active field transform with Escape', async () => {
    const onPendingFieldTransformChanged = vi.fn<
      (transform: PendingFieldTransform | null) => void
    >()
    const onFieldBoxChanged = vi.fn<
      (draftId: string, box: NormalizedBox) => void
    >()
    const { container } = render(
      <PdfWorkspace
        document={createReadyPdfDocument()}
        pageNumber={1}
        fields={[field]}
        zoom={1}
        activeTool="select"
        selectedDraftId={field.draftId}
        pendingSelection={null}
        showDetectedFields
        onFieldSelected={vi.fn()}
        onPendingSelectionChanged={vi.fn()}
        onPendingFieldTransformChanged={onPendingFieldTransformChanged}
        onManualFieldCreated={vi.fn()}
        onFieldBoxChanged={onFieldBoxChanged}
      />,
    )
    const pageElement = container.querySelector<HTMLDivElement>('.pdf-page')
    mockPageBounds(pageElement)
    const fieldOverlay = await waitFor(() => {
      const overlay = container.querySelector<HTMLElement>('.detected-field')
      expect(overlay).not.toBeNull()
      return overlay!
    })

    fireEvent.pointerDown(fieldOverlay, {
      pointerId: 11,
      button: 0,
      clientX: 160,
      clientY: 130,
    })
    fireEvent.pointerMove(pageElement, {
      pointerId: 11,
      clientX: 220,
      clientY: 210,
    })
    fireEvent.keyDown(pageElement, { key: 'Escape' })

    expect(onPendingFieldTransformChanged).toHaveBeenLastCalledWith(null)
    expect(onFieldBoxChanged).not.toHaveBeenCalled()
  })
})

function createReadyPdfDocument(): PdfTemplateDocument {
  return createPdfDocument(() =>
    Promise.resolve({ widthPx: 600, heightPx: 800, rotationDegrees: 0 }),
  )
}

function createPdfDocument(
  renderPage: PdfTemplateDocument['renderPage'],
): PdfTemplateDocument {
  return {
    pageCount: 1,
    getPageMetadata: () => Promise.resolve([]),
    getWidgets: () => Promise.resolve([]),
    renderPage,
    destroy: () => Promise.resolve(),
  }
}

function mockPageBounds(
  pageElement: HTMLDivElement | null,
): asserts pageElement is HTMLDivElement {
  if (pageElement === null) {
    throw new Error('Expected the PDF page element to exist.')
  }

  vi.spyOn(pageElement, 'getBoundingClientRect').mockReturnValue({
    x: 100,
    y: 50,
    left: 100,
    top: 50,
    right: 700,
    bottom: 850,
    width: 600,
    height: 800,
    toJSON: () => ({}),
  })
}

function expectBoxToBeClose(
  actual: DraftFieldAnnotation['box'] | undefined,
  expected: DraftFieldAnnotation['box'],
): void {
  expect(actual).toBeDefined()
  expect(actual?.x).toBeCloseTo(expected.x)
  expect(actual?.y).toBeCloseTo(expected.y)
  expect(actual?.width).toBeCloseTo(expected.width)
  expect(actual?.height).toBeCloseTo(expected.height)
}
