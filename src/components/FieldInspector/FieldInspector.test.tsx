import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DraftFieldAnnotation } from '../../domain/annotation-draft'
import type { NormalizedBox } from '../../domain/annotation-types'
import type { DraftFieldMappingPatch } from '../../state/editor-actions'
import { createInitialEditorState } from '../../state/editor-state'
import { FieldInspector } from './FieldInspector'

const mappedField: DraftFieldAnnotation = {
  draftId: 'manual:field-1',
  origin: 'manual',
  mappingStatus: 'mapped',
  id: 'form1040.line1a.wages',
  label: 'Line 1a wages',
  page: 1,
  source: {
    kind: 'json-pointer',
    pointer: '/returns/federal/2025/income/wages',
  },
  box: { x: 0.7, y: 0.5, width: 0.2, height: 0.03 },
  format: {
    type: 'money',
    decimalPlaces: 0,
    useThousandsSeparator: true,
    showCurrencySymbol: false,
    currencySymbol: '$',
    negativeStyle: 'minus',
  },
}

describe('FieldInspector', () => {
  it('shows mapping readiness and emits mapping changes', () => {
    const onMappingChanged = vi.fn<(mapping: DraftFieldMappingPatch) => void>()
    renderInspector({ onMappingChanged })

    expect(screen.getByText('This field is ready to preview.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/JSON Pointer/), {
      target: { value: '/returns/federal/2025/summary/amountOwed' },
    })
    fireEvent.change(screen.getByLabelText(/Format/), {
      target: { value: 'checkbox' },
    })

    expect(onMappingChanged).toHaveBeenCalledWith({
      source: {
        kind: 'json-pointer',
        pointer: '/returns/federal/2025/summary/amountOwed',
      },
    })
    expect(onMappingChanged).toHaveBeenCalledWith({
      format: { type: 'checkbox', trueMark: 'X', falseMark: '' },
    })
  })

  it('reports incomplete and duplicate mappings', () => {
    renderInspector({
      field: {
        ...mappedField,
        id: '',
        label: '',
        source: { kind: 'json-pointer', pointer: 'not/absolute' },
        format: undefined,
        mappingStatus: 'invalid',
      },
      hasDuplicateId: true,
    })

    expect(screen.getByLabelText('Mapping issues')).toHaveTextContent(
      'Enter a field ID.',
    )
    expect(screen.getByLabelText('Mapping issues')).toHaveTextContent(
      'Enter a human-readable label.',
    )
    expect(screen.getByLabelText('Mapping issues')).toHaveTextContent(
      'Enter a valid absolute JSON Pointer',
    )
    expect(screen.getByLabelText('Mapping issues')).toHaveTextContent(
      'Choose a field format.',
    )
  })

  it('commits a valid normalized coordinate on blur', () => {
    const onBoxChanged = vi.fn<(box: NormalizedBox) => void>()
    renderInspector({ onBoxChanged })

    fireEvent.blur(screen.getByLabelText('x'), { target: { value: '0.6' } })

    expect(onBoxChanged).toHaveBeenCalledWith({
      x: 0.6,
      y: 0.5,
      width: 0.2,
      height: 0.03,
    })
  })

  it('confirms before deleting a field', () => {
    const onRemove = vi.fn<() => void>()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderInspector({ onRemove })

    fireEvent.click(screen.getByRole('button', { name: 'Delete field' }))

    expect(onRemove).toHaveBeenCalledOnce()
  })
})

interface InspectorOverrides {
  field?: DraftFieldAnnotation
  hasDuplicateId?: boolean
  onMappingChanged?: (mapping: DraftFieldMappingPatch) => void
  onBoxChanged?: (box: NormalizedBox) => void
  onRemove?: () => void
}

function renderInspector(overrides: InspectorOverrides = {}) {
  const initialState = createInitialEditorState()

  return render(
    <FieldInspector
      field={overrides.field ?? mappedField}
      defaultStyle={initialState.draft.defaults.style}
      defaultBehavior={initialState.draft.defaults.behavior}
      hasDuplicateId={overrides.hasDuplicateId ?? false}
      onMappingChanged={overrides.onMappingChanged ?? vi.fn()}
      onBoxChanged={overrides.onBoxChanged ?? vi.fn()}
      onStyleChanged={vi.fn()}
      onBehaviorChanged={vi.fn()}
      onRemove={overrides.onRemove ?? vi.fn()}
    />,
  )
}
