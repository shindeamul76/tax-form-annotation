import type { ChangeEvent } from 'react'
import type { DraftFormMetadata } from '../../domain/annotation-draft'
import type { DataContract } from '../../domain/annotation-types'
import { validateDraftMetadata } from '../../domain/metadata-validation'
import './FormMetadataEditor.css'

interface FormMetadataEditorProps {
  form: DraftFormMetadata
  dataContract: DataContract
  onFormChanged: (
    metadata: Partial<
      Pick<DraftFormMetadata, 'formId' | 'title' | 'taxYear' | 'revision'>
    >,
  ) => void
  onDataContractChanged: (dataContract: DataContract) => void
}

export function FormMetadataEditor({
  form,
  dataContract,
  onFormChanged,
  onDataContractChanged,
}: FormMetadataEditorProps) {
  const diagnostics = validateDraftMetadata(form, dataContract)
  const isComplete = diagnostics.length === 0

  const handleTaxYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const taxYear = event.currentTarget.valueAsNumber
    onFormChanged({
      taxYear: Number.isInteger(taxYear) ? taxYear : undefined,
    })
  }

  return (
    <section className="sidebar-card metadata-editor" aria-labelledby="metadata-editor-heading">
      <div className="sidebar-card__heading">
        <div>
          <h3 id="metadata-editor-heading">Form metadata</h3>
          <p>Describe the exact form and expected dataset contract.</p>
        </div>
        <span
          className={`metadata-status metadata-status--${isComplete ? 'complete' : 'incomplete'}`}
        >
          {isComplete ? 'Complete' : 'Incomplete'}
        </span>
      </div>

      <div className="metadata-input-grid">
        <label>
          Form ID
          <input
            required
            value={form.formId ?? ''}
            placeholder="IRS-1040"
            aria-invalid={hasDiagnostic(diagnostics, '/form/formId')}
            onChange={(event) =>
              onFormChanged({ formId: event.currentTarget.value })
            }
          />
        </label>
        <label>
          Tax year
          <input
            required
            type="number"
            min="1900"
            max="9999"
            step="1"
            value={form.taxYear ?? ''}
            placeholder="2025"
            aria-invalid={hasDiagnostic(diagnostics, '/form/taxYear')}
            onChange={handleTaxYearChange}
          />
        </label>
        <label className="metadata-wide-input">
          Form title
          <input
            required
            value={form.title ?? ''}
            placeholder="U.S. Individual Income Tax Return"
            aria-invalid={hasDiagnostic(diagnostics, '/form/title')}
            onChange={(event) =>
              onFormChanged({ title: event.currentTarget.value })
            }
          />
        </label>
        <label className="metadata-wide-input">
          Revision
          <input
            required
            value={form.revision ?? ''}
            placeholder="2025-final"
            aria-invalid={hasDiagnostic(diagnostics, '/form/revision')}
            onChange={(event) =>
              onFormChanged({ revision: event.currentTarget.value })
            }
          />
        </label>
      </div>

      <details className="metadata-contract-editor">
        <summary>Data contract</summary>
        <p>
          Identifies the JSON structure that field pointers expect. It does not
          contain taxpayer values.
        </p>
        <div className="metadata-input-grid">
          <label className="metadata-wide-input">
            Contract ID
            <input
              required
              value={dataContract.id}
              aria-invalid={hasDiagnostic(diagnostics, '/dataContract/id')}
              onChange={(event) =>
                onDataContractChanged({
                  ...dataContract,
                  id: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            Version
            <input
              required
              value={dataContract.version}
              placeholder="1.0"
              aria-invalid={hasDiagnostic(
                diagnostics,
                '/dataContract/version',
              )}
              onChange={(event) =>
                onDataContractChanged({
                  ...dataContract,
                  version: event.currentTarget.value,
                })
              }
            />
          </label>
        </div>
      </details>

      {isComplete ? (
        <p className="metadata-complete-message">
          Metadata is ready for annotation validation.
        </p>
      ) : (
        <ul className="metadata-issue-list" aria-label="Metadata issues">
          {diagnostics.map((diagnostic) => (
            <li key={diagnostic.code}>{diagnostic.message}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function hasDiagnostic(
  diagnostics: ReturnType<typeof validateDraftMetadata>,
  path: string,
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.path === path)
}
