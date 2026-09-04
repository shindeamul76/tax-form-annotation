import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilledPdfPanel } from './FilledPdfPanel'

describe('FilledPdfPanel', () => {
  it('requires sample data before enabling generation', () => {
    renderPanel({ hasDataset: false, canGenerate: false })

    expect(
      screen.getByText(/Load fictional sample JSON/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Download filled PDF' }),
    ).toBeDisabled()
  })

  it('starts generation when every prerequisite is available', () => {
    const onGenerate = vi.fn()
    renderPanel({ canGenerate: true, onGenerate })

    fireEvent.click(
      screen.getByRole('button', { name: 'Download filled PDF' }),
    )
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('shows generation progress and disables duplicate requests', () => {
    renderPanel({ status: 'generating', canGenerate: true })

    expect(
      screen.getByRole('button', { name: 'Generating PDF…' }),
    ).toBeDisabled()
    expect(screen.getByText(/measuring text/)).toBeInTheDocument()
  })

  it('reports a downloaded file and generation diagnostics', () => {
    renderPanel({
      status: 'ready',
      downloadedFileName: 'irs-1040-2025.filled.pdf',
      diagnostics: [
        {
          severity: 'warning',
          code: 'FIELD_POINTER_MISSING',
          message: 'A warning-only value was left blank.',
          fieldId: 'form1040.optionalField',
        },
      ],
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Downloaded irs-1040-2025.filled.pdf',
    )
    expect(screen.getByLabelText('PDF generation issues')).toHaveTextContent(
      'A warning-only value was left blank.',
    )
  })
})

interface PanelOverrides {
  status?: Parameters<typeof FilledPdfPanel>[0]['status']
  canGenerate?: boolean
  hasDataset?: boolean
  downloadedFileName?: string | null
  diagnostics?: Parameters<typeof FilledPdfPanel>[0]['diagnostics']
  onGenerate?: () => void
}

function renderPanel(overrides: PanelOverrides = {}) {
  return render(
    <FilledPdfPanel
      status={overrides.status ?? 'idle'}
      canGenerate={overrides.canGenerate ?? false}
      hasDataset={overrides.hasDataset ?? true}
      downloadedFileName={overrides.downloadedFileName ?? null}
      diagnostics={overrides.diagnostics ?? []}
      onGenerate={overrides.onGenerate ?? vi.fn()}
    />,
  )
}
