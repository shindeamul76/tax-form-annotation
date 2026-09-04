import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SampleDatasetState } from '../../state/editor-state'
import { DataPreviewPanel } from './DataPreviewPanel'

const readyDataset: SampleDatasetState = {
  status: 'ready',
  session: {
    fileName: 'sample-taxpayer-data.json',
    value: { wages: 60_000 },
  },
  errorMessage: null,
}

describe('DataPreviewPanel', () => {
  it('loads the included sample or a local JSON file', () => {
    const onBundledSampleLoad = vi.fn<() => void>()
    const onFileSelected = vi.fn<(file: File) => void>()
    renderPanel({
      dataset: { status: 'idle', session: null, errorMessage: null },
      onBundledSampleLoad,
      onFileSelected,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Load sample JSON' }))
    const file = new File(['{"wages":60000}'], 'taxpayer.json', {
      type: 'application/json',
    })
    fireEvent.change(screen.getByLabelText('Upload sample taxpayer JSON'), {
      target: { files: [file] },
    })

    expect(onBundledSampleLoad).toHaveBeenCalledOnce()
    expect(onFileSelected).toHaveBeenCalledWith(file)
    expect(screen.getByRole('checkbox', { name: 'Preview' })).toBeDisabled()
  })

  it('shows preview counts, diagnostics, and clear action', () => {
    const onClear = vi.fn<() => void>()
    renderPanel({
      previewEnabled: true,
      mappedFieldCount: 3,
      renderedValueCount: 2,
      diagnostics: [
        {
          severity: 'warning',
          code: 'FIELD_POINTER_MISSING',
          message: 'The source path does not exist in the dataset.',
        },
      ],
      onClear,
    })

    expect(screen.getByText('sample-taxpayer-data.json')).toBeInTheDocument()
    expect(screen.getByLabelText('Preview diagnostics')).toHaveTextContent(
      'The source path does not exist',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear data' }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})

interface PanelOverrides {
  dataset?: SampleDatasetState
  previewEnabled?: boolean
  mappedFieldCount?: number
  renderedValueCount?: number
  diagnostics?: Parameters<typeof DataPreviewPanel>[0]['diagnostics']
  onBundledSampleLoad?: () => void
  onFileSelected?: (file: File) => void
  onClear?: () => void
}

function renderPanel(overrides: PanelOverrides = {}) {
  return render(
    <DataPreviewPanel
      dataset={overrides.dataset ?? readyDataset}
      previewEnabled={overrides.previewEnabled ?? false}
      mappedFieldCount={overrides.mappedFieldCount ?? 1}
      renderedValueCount={overrides.renderedValueCount ?? 0}
      diagnostics={overrides.diagnostics ?? []}
      onBundledSampleLoad={overrides.onBundledSampleLoad ?? vi.fn()}
      onFileSelected={overrides.onFileSelected ?? vi.fn()}
      onPreviewChanged={vi.fn()}
      onClear={overrides.onClear ?? vi.fn()}
    />,
  )
}
