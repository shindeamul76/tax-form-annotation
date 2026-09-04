import type { ChangeEvent } from 'react'
import type { Diagnostic } from '../../domain/diagnostics'
import type { SampleDatasetState } from '../../state/editor-state'
import './DataPreviewPanel.css'

interface DataPreviewPanelProps {
  dataset: SampleDatasetState
  previewEnabled: boolean
  mappedFieldCount: number
  renderedValueCount: number
  diagnostics: Diagnostic[]
  onBundledSampleLoad: () => void
  onFileSelected: (file: File) => void
  onPreviewChanged: (enabled: boolean) => void
  onClear: () => void
}

export function DataPreviewPanel({
  dataset,
  previewEnabled,
  mappedFieldCount,
  renderedValueCount,
  diagnostics,
  onBundledSampleLoad,
  onFileSelected,
  onPreviewChanged,
  onClear,
}: DataPreviewPanelProps) {
  const hasDataset = dataset.session !== null
  const isLoading = dataset.status === 'loading'
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (file !== undefined) {
      onFileSelected(file)
    }
  }

  return (
    <section className="sidebar-card data-preview-panel" aria-labelledby="data-preview-heading">
      <div className="sidebar-card__heading">
        <div>
          <h3 id="data-preview-heading">Sample-data preview</h3>
          <p>Resolve mapped fields without changing the PDF or annotation.</p>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={previewEnabled}
            disabled={!hasDataset || mappedFieldCount === 0}
            onChange={(event) =>
              onPreviewChanged(event.currentTarget.checked)
            }
          />
          Preview
        </label>
      </div>

      <div className="preview-load-actions">
        <button
          className="button button--secondary preview-load-button"
          type="button"
          disabled={isLoading}
          onClick={onBundledSampleLoad}
        >
          Load sample JSON
        </button>
        <label className="button button--secondary preview-load-button">
          Choose JSON
          <input
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="Upload sample taxpayer JSON"
            disabled={isLoading}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {isLoading ? <p role="status">Reading sample data…</p> : null}

      {dataset.errorMessage === null ? null : (
        <p className="preview-error" role="alert">
          {dataset.errorMessage}
        </p>
      )}

      {dataset.session === null ? (
        <p>No sample dataset loaded.</p>
      ) : (
        <div className="preview-summary">
          <div>
            <span>Dataset</span>
            <strong title={dataset.session.fileName}>
              {dataset.session.fileName}
            </strong>
          </div>
          <div>
            <span>Mapped</span>
            <strong>{mappedFieldCount}</strong>
          </div>
          <div>
            <span>Rendered</span>
            <strong>{previewEnabled ? renderedValueCount : '—'}</strong>
          </div>
          <button type="button" onClick={onClear}>
            Clear data
          </button>
        </div>
      )}

      {previewEnabled && diagnostics.length > 0 ? (
        <ul className="preview-diagnostic-list" aria-label="Preview diagnostics">
          {diagnostics.map((diagnostic, index) => (
            <li
              className={`preview-diagnostic preview-diagnostic--${diagnostic.severity}`}
              key={`${diagnostic.code}:${diagnostic.fieldId ?? ''}:${index}`}
            >
              <strong>{diagnostic.severity}</strong> {diagnostic.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
