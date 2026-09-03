import { useCallback, useReducer, type ChangeEvent } from 'react'
import { createAcroFormDraftFields } from './app/create-acroform-drafts'
import { createManualDraft } from './app/create-manual-draft'
import type { LoadedPdfTemplate } from './app/load-pdf-template'
import { usePdfTemplate } from './app/use-pdf-template'
import { PdfWorkspace } from './components/PdfWorkspace/PdfWorkspace'
import type { NormalizedBox } from './domain/annotation-types'
import { editorReducer } from './state/editor-reducer'
import {
  selectCurrentPageFields,
  selectSelectedField,
} from './state/editor-selectors'
import { createInitialEditorState } from './state/editor-state'
import './App.css'

const bundledTemplateFileName = 'f1040-2025.pdf'
const bundledTemplateUrl = new URL(
  '../examples/templates/f1040-2025.pdf',
  import.meta.url,
).href

function App() {
  const [editorState, dispatch] = useReducer(
    editorReducer,
    undefined,
    createInitialEditorState,
  )

  const handleLoadStarted = useCallback(() => {
    dispatch({ type: 'template/loadStarted' })
  }, [])

  const handleLoadSucceeded = useCallback(
    (loadedTemplate: LoadedPdfTemplate) => {
      dispatch({
        type: 'template/loadSucceeded',
        session: loadedTemplate.session,
      })
      dispatch({
        type: 'fields/imported',
        fields: createAcroFormDraftFields(loadedTemplate.importedFields),
      })
      dispatch({
        type: 'diagnostics/replaced',
        diagnostics: loadedTemplate.diagnostics,
      })
    },
    [],
  )

  const handleLoadFailed = useCallback((errorMessage: string) => {
    dispatch({ type: 'template/loadFailed', errorMessage })
  }, [])

  const { document, loadFile, loadUrl } = usePdfTemplate({
    onLoadStarted: handleLoadStarted,
    onLoadSucceeded: handleLoadSucceeded,
    onLoadFailed: handleLoadFailed,
  })

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (selectedFile !== undefined) {
      void loadFile(selectedFile)
    }
  }

  const handleBundledTemplateLoad = () => {
    void loadUrl(bundledTemplateFileName, bundledTemplateUrl)
  }

  const handleManualFieldCreated = (box: NormalizedBox) => {
    dispatch({
      type: 'field/created',
      field: createManualDraft({
        page: editorState.ui.currentPage,
        box,
      }),
    })
  }

  const currentPage = editorState.ui.currentPage
  const currentPageFields = selectCurrentPageFields(editorState)
  const selectedField = selectSelectedField(editorState)
  const template = editorState.template
  const isLoading = editorState.templateLoad.status === 'loading'
  const pageCount = template?.pages.length ?? 0
  const importWarnings = editorState.diagnostics.filter(
    ({ severity }) => severity === 'warning',
  )

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Tax form annotator</p>
          <h1>Map structured data to an exact tax form.</h1>
          <p className="app-introduction">
            Load a PDF, detect its existing form fields, and review their
            normalized coordinates before adding semantic mappings.
          </p>
        </div>
        <span className="privacy-badge">Local browser processing</span>
      </header>

      <section className="load-panel" aria-labelledby="load-heading">
        <div>
          <p className="step-label">Step 1</p>
          <h2 id="load-heading">Load an exact PDF template</h2>
          <p>
            Start with the included 2025 Form 1040 or choose another PDF from
            your computer.
          </p>
        </div>
        <div className="load-actions">
          <button
            className="button button--primary"
            type="button"
            disabled={isLoading}
            onClick={handleBundledTemplateLoad}
          >
            Load included Form 1040
          </button>
          <label className="button button--secondary">
            Choose PDF
            <input
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              aria-label="Upload PDF template"
              disabled={isLoading}
              onChange={handleFileChange}
            />
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className="notice" role="status">
          Reading the template, calculating its checksum, and detecting form
          fields…
        </div>
      ) : null}

      {editorState.templateLoad.errorMessage !== null ? (
        <div className="notice notice--error" role="alert">
          {editorState.templateLoad.errorMessage}
        </div>
      ) : null}

      {template === null || document === null ? (
        <section className="empty-state" aria-label="No template loaded">
          <div className="empty-state__icon" aria-hidden="true">
            PDF
          </div>
          <h2>No template loaded yet</h2>
          <p>The PDF viewer and detected field coordinates will appear here.</p>
        </section>
      ) : (
        <section className="review-section" aria-labelledby="review-heading">
          <div className="review-heading-row">
            <div>
              <p className="step-label">Step 2</p>
              <h2 id="review-heading">Review detected fields</h2>
            </div>
            <div className="page-controls" aria-label="PDF page controls">
              <button
                className="icon-button"
                type="button"
                aria-label="Decrease zoom"
                disabled={editorState.ui.zoom <= 0.5}
                onClick={() =>
                  dispatch({
                    type: 'ui/zoomChanged',
                    zoom: editorState.ui.zoom - 0.1,
                  })
                }
              >
                −
              </button>
              <span>{Math.round(editorState.ui.zoom * 100)}%</span>
              <button
                className="icon-button"
                type="button"
                aria-label="Increase zoom"
                disabled={editorState.ui.zoom >= 3}
                onClick={() =>
                  dispatch({
                    type: 'ui/zoomChanged',
                    zoom: editorState.ui.zoom + 0.1,
                  })
                }
              >
                +
              </button>
              <span className="control-separator" aria-hidden="true" />
              <button
                className="icon-button"
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() =>
                  dispatch({
                    type: 'ui/pageChanged',
                    pageNumber: currentPage - 1,
                  })
                }
              >
                ←
              </button>
              <span>
                Page <strong>{currentPage}</strong> of {pageCount}
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label="Next page"
                disabled={currentPage === pageCount}
                onClick={() =>
                  dispatch({
                    type: 'ui/pageChanged',
                    pageNumber: currentPage + 1,
                  })
                }
              >
                →
              </button>
            </div>
          </div>

          <div className="editor-toolbar">
            <div
              className="tool-selector"
              role="toolbar"
              aria-label="Annotation tools"
            >
              <button
                className="tool-button"
                type="button"
                aria-pressed={editorState.ui.activeTool === 'select'}
                onClick={() =>
                  dispatch({ type: 'ui/toolChanged', tool: 'select' })
                }
              >
                Select
              </button>
              <button
                className="tool-button"
                type="button"
                aria-pressed={editorState.ui.activeTool === 'draw'}
                onClick={() =>
                  dispatch({ type: 'ui/toolChanged', tool: 'draw' })
                }
              >
                Draw box
              </button>
            </div>
            <p className="tool-guidance">
              {editorState.ui.activeTool === 'draw'
                ? 'Drag anywhere on the PDF to create a field. Press Escape to cancel.'
                : 'Drag a highlighted box to move it, or drag its handles to resize it.'}
            </p>
          </div>

          <div className="review-grid">
            <PdfWorkspace
              key={`${template.sha256}:${currentPage}`}
              document={document}
              pageNumber={currentPage}
              fields={currentPageFields}
              zoom={editorState.ui.zoom}
              activeTool={editorState.ui.activeTool}
              selectedDraftId={editorState.ui.selectedDraftId}
              pendingSelection={editorState.ui.pendingSelection}
              showDetectedFields={editorState.ui.showDetectedFields}
              onFieldSelected={(draftId) =>
                dispatch({ type: 'field/selected', draftId })
              }
              onPendingSelectionChanged={(selection) =>
                dispatch({
                  type: 'ui/pendingSelectionChanged',
                  selection,
                })
              }
              onPendingFieldTransformChanged={(transform) =>
                dispatch({
                  type: 'ui/pendingFieldTransformChanged',
                  transform,
                })
              }
              onManualFieldCreated={handleManualFieldCreated}
              onFieldBoxChanged={(draftId, box) =>
                dispatch({ type: 'field/boxChanged', draftId, box })
              }
            />

            <aside className="template-sidebar" aria-label="Template details">
              <section className="sidebar-card">
                <div className="sidebar-card__heading">
                  <h3>Template</h3>
                  <span className="status-dot">
                    {editorState.isDirty ? 'Draft' : 'Saved'}
                  </span>
                </div>
                <dl className="template-facts">
                  <div>
                    <dt>File</dt>
                    <dd>{template.fileName}</dd>
                  </div>
                  <div>
                    <dt>Pages</dt>
                    <dd>{pageCount}</dd>
                  </div>
                  <div>
                    <dt>Draft fields</dt>
                    <dd>{editorState.draft.fields.length}</dd>
                  </div>
                  <div>
                    <dt>SHA-256</dt>
                    <dd className="checksum" title={template.sha256}>
                      {shortenChecksum(template.sha256)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="sidebar-card">
                <div className="sidebar-card__heading">
                  <div>
                    <h3>Page {currentPage} fields</h3>
                    <p>{currentPageFields.length} drafts on this page</p>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={editorState.ui.showDetectedFields}
                      onChange={(event) =>
                        dispatch({
                          type: 'ui/detectedFieldsChanged',
                          visible: event.currentTarget.checked,
                        })
                      }
                    />
                    Show boxes
                  </label>
                </div>

                {currentPageFields.length === 0 ? (
                  <p className="field-empty-message">
                    This page has no importable AcroForm widgets. Manual drawing
                    will be the fallback.
                  </p>
                ) : (
                  <ol className="detected-field-list">
                    {currentPageFields.map((field) => (
                      <li key={field.draftId}>
                        <button
                          className="field-list-button"
                          type="button"
                          aria-pressed={
                            editorState.ui.selectedDraftId === field.draftId
                          }
                          onClick={() =>
                            dispatch({
                              type: 'field/selected',
                              draftId: field.draftId,
                            })
                          }
                        >
                          <span className="field-kind">
                            {field.sourceFieldKind ?? field.origin}
                          </span>
                          <span
                            title={field.originalPdfFieldName ?? field.draftId}
                          >
                            {field.originalPdfFieldName ?? field.draftId}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {selectedField !== undefined ? (
                <section className="sidebar-card selected-field-card">
                  <div className="sidebar-card__heading">
                    <h3>Selected draft</h3>
                    <span className="field-kind">
                      {selectedField.mappingStatus}
                    </span>
                  </div>
                  <p title={selectedField.originalPdfFieldName}>
                    {selectedField.originalPdfFieldName ?? selectedField.draftId}
                  </p>
                  <p className="selected-field-hint">
                    Drag the box to move it. Drag a handle to resize it.
                  </p>
                  <dl className="coordinate-facts">
                    <div>
                      <dt>x</dt>
                      <dd>{formatCoordinate(selectedField.box.x)}</dd>
                    </div>
                    <div>
                      <dt>y</dt>
                      <dd>{formatCoordinate(selectedField.box.y)}</dd>
                    </div>
                    <div>
                      <dt>width</dt>
                      <dd>{formatCoordinate(selectedField.box.width)}</dd>
                    </div>
                    <div>
                      <dt>height</dt>
                      <dd>{formatCoordinate(selectedField.box.height)}</dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              {importWarnings.length > 0 ? (
                <section className="sidebar-card sidebar-card--warning">
                  <h3>Import warnings</h3>
                  <p>
                    {importWarnings.length} PDF widgets were skipped because
                    their page or rectangle was invalid.
                  </p>
                </section>
              ) : null}
            </aside>
          </div>
        </section>
      )}
    </main>
  )
}

function shortenChecksum(checksum: string): string {
  return `${checksum.slice(0, 10)}…${checksum.slice(-8)}`
}

function formatCoordinate(value: number): string {
  return value.toFixed(4)
}

export default App
