import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldMappingActions } from './FieldMappingActions'

describe('FieldMappingActions', () => {
  it('enables one-click mapping for a compatible dataset and profile', () => {
    const onAutoMap = vi.fn<() => void>()
    renderActions({ onAutoMap })

    fireEvent.click(
      screen.getByRole('button', { name: 'Auto-map 111 sample fields' }),
    )

    expect(onAutoMap).toHaveBeenCalledOnce()
    expect(screen.getByText('88')).toBeInTheDocument()
  })

  it('explains why automatic mapping is unavailable before data is loaded', () => {
    renderActions({ hasDataset: false })

    expect(
      screen.getByText(
        'Load the sample JSON to enable its verified Form 1040 mappings.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Auto-map 111 sample fields' }),
    ).toBeDisabled()
  })

  it('requires confirmation before excluding all unmapped fields', () => {
    const onExcludeUnmapped = vi.fn<() => void>()
    const confirmExclusion = vi
      .spyOn(window, 'confirm')
      .mockReturnValue(true)
    renderActions({
      automaticMappingCount: 0,
      mappedFieldCount: 111,
      onExcludeUnmapped,
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Exclude 88 unmapped fields' }),
    )

    expect(confirmExclusion).toHaveBeenCalledWith(
      'Exclude all 88 unmapped fields from this annotation? Mapped and partially edited fields will be kept.',
    )
    expect(onExcludeUnmapped).toHaveBeenCalledOnce()
  })

  it('warns before excluding fields that could still be auto-mapped', () => {
    const confirmExclusion = vi
      .spyOn(window, 'confirm')
      .mockReturnValue(false)
    const onExcludeUnmapped = vi.fn<() => void>()
    renderActions({ onExcludeUnmapped })

    fireEvent.click(
      screen.getByRole('button', { name: 'Exclude 88 unmapped fields' }),
    )

    expect(confirmExclusion).toHaveBeenCalledWith(
      'Exclude all 88 unmapped fields from this annotation? Mapped and partially edited fields will be kept. 111 supported fields can still be auto-mapped and will also be excluded.',
    )
    expect(onExcludeUnmapped).not.toHaveBeenCalled()
  })
})

interface ActionOverrides {
  mappedFieldCount?: number
  unmappedFieldCount?: number
  invalidFieldCount?: number
  automaticMappingCount?: number
  hasKnownTemplateProfile?: boolean
  hasDataset?: boolean
  isDatasetCompatible?: boolean
  onAutoMap?: () => void
  onExcludeUnmapped?: () => void
}

function renderActions(overrides: ActionOverrides = {}) {
  return render(
    <FieldMappingActions
      mappedFieldCount={overrides.mappedFieldCount ?? 0}
      unmappedFieldCount={overrides.unmappedFieldCount ?? 88}
      invalidFieldCount={overrides.invalidFieldCount ?? 0}
      automaticMappingCount={overrides.automaticMappingCount ?? 111}
      hasKnownTemplateProfile={overrides.hasKnownTemplateProfile ?? true}
      hasDataset={overrides.hasDataset ?? true}
      isDatasetCompatible={overrides.isDatasetCompatible ?? true}
      onAutoMap={overrides.onAutoMap ?? vi.fn()}
      onExcludeUnmapped={overrides.onExcludeUnmapped ?? vi.fn()}
    />,
  )
}
