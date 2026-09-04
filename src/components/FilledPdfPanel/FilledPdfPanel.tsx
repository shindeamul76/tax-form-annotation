import type { Diagnostic } from '../../domain/diagnostics'
import './FilledPdfPanel.css'

export type FilledPdfStatus = 'idle' | 'generating' | 'ready' | 'error'

interface FilledPdfPanelProps {
  status: FilledPdfStatus
  canGenerate: boolean
  hasDataset: boolean
  downloadedFileName: string | null
  diagnostics: Diagnostic[]
  onGenerate: () => void
}

export function FilledPdfPanel({
  status,
  canGenerate,
  hasDataset,
  downloadedFileName,
  diagnostics,
  onGenerate,
}: FilledPdfPanelProps) {
  const isGenerating = status === 'generating'

  return (
    <section
      className="sidebar-card filled-pdf-panel"
      aria-labelledby="filled-pdf-heading"
    >
      <div>
        <h3 id="filled-pdf-heading">Filled PDF</h3>
        <p>{getGuidance(status, canGenerate, hasDataset)}</p>
      </div>

      {status === 'ready' && downloadedFileName !== null ? (
        <p className="filled-pdf-success" role="status">
          Downloaded {downloadedFileName}
        </p>
      ) : null}

      {diagnostics.length > 0 ? (
        <ul className="filled-pdf-diagnostics" aria-label="PDF generation issues">
          {diagnostics.map((diagnostic, diagnosticIndex) => (
            <li
              key={`${diagnostic.code}:${diagnostic.fieldId ?? ''}:${diagnosticIndex}`}
              data-severity={diagnostic.severity}
            >
              <strong>{diagnostic.message}</strong>
              <span>
                {diagnostic.fieldId ?? diagnostic.path ?? diagnostic.code}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        className="filled-pdf-button"
        type="button"
        disabled={!canGenerate || isGenerating}
        onClick={onGenerate}
      >
        {isGenerating ? 'Generating PDF…' : 'Download filled PDF'}
      </button>
    </section>
  )
}

function getGuidance(
  status: FilledPdfStatus,
  canGenerate: boolean,
  hasDataset: boolean,
): string {
  if (status === 'generating') {
    return 'Resolving values, measuring text, and drawing onto a local copy.'
  }

  if (!hasDataset) {
    return 'Load fictional sample JSON before generating a filled PDF.'
  }

  if (!canGenerate) {
    return 'Resolve annotation and sample-data errors before generating.'
  }

  return 'Draw the current sample values onto a copy of the exact template.'
}
