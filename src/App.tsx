import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { createAcroFormDraftFields } from './app/create-acroform-drafts'
import { createManualDraft } from './app/create-manual-draft'
import { evaluateAnnotationReadiness } from './app/evaluate-annotation-readiness'
import { findKnownTemplateProfile } from './app/known-template-profiles'
import type { LoadedPdfTemplate } from './app/load-pdf-template'
import { usePdfTemplate } from './app/use-pdf-template'
import { AnnotationDefaultsEditor } from './components/AnnotationDefaultsEditor/AnnotationDefaultsEditor'
import { DataPreviewPanel } from './components/DataPreviewPanel/DataPreviewPanel'
import { FieldMappingActions } from './components/FieldMappingActions/FieldMappingActions'
import { FieldInspector } from './components/FieldInspector/FieldInspector'
import {
  FilledPdfPanel,
  type FilledPdfStatus,
} from './components/FilledPdfPanel/FilledPdfPanel'
import { FormMetadataEditor } from './components/FormMetadataEditor/FormMetadataEditor'
import { PdfWorkspace } from './components/PdfWorkspace/PdfWorkspace'
import { ValidationPanel } from './components/ValidationPanel/ValidationPanel'
import type {
  AnnotationDocument,
  NormalizedBox,
} from './domain/annotation-types'
import type { DraftFieldAnnotation } from './domain/annotation-draft'
import type { Diagnostic } from './domain/diagnostics'
import { findAutomaticFieldMappings } from './domain/field-auto-mapping'
import { resolveRenderValuesForFields } from './domain/render-values'
import { validateDatasetContract } from './domain/validation'
import {
  ANNOTATION_JSON_MIME_TYPE,
  createAnnotationJsonFile,
} from './io/annotation-json'
import { downloadBlob } from './io/file-download'
import { parseJsonDataset } from './io/json-dataset'
import { createFormArtifactFileName } from './io/output-file-name'
import { editorReducer } from './state/editor-reducer'
import {
  createAnnotationCandidate,
  selectCurrentPageFields,
  selectPreviewFields,
  selectSelectedField,
} from './state/editor-selectors'
import {
  createInitialEditorState,
  type SampleDatasetSession,
  type TemplateSession,
} from './state/editor-state'
import './App.css'

const bundledTemplateFileName = 'f1040-2025.pdf'
const bundledTemplateUrl = new URL(
  '../examples/templates/f1040-2025.pdf',
  import.meta.url,
).href
const bundledDatasetFileName = 'sample-taxpayer-data.json'
const bundledDatasetUrl = new URL(
  '../examples/data/sample-taxpayer-data.json',
  import.meta.url,
).href

interface FilledPdfGenerationState {
  status: FilledPdfStatus
  diagnostics: Diagnostic[]
  downloadedFileName: string | null
  source: FilledPdfGenerationSource | null
}

interface FilledPdfGenerationSource {
  annotation: AnnotationDocument
  template: TemplateSession
  dataset: SampleDatasetSession
}

const idleFilledPdfState: FilledPdfGenerationState = {
  status: 'idle',
  diagnostics: [],
  downloadedFileName: null,
  source: null,
}

function App() {
  const [editorState, dispatch] = useReducer(
    editorReducer,
    undefined,
    createInitialEditorState,
  )
  const [filledPdfState, setFilledPdfState] =
    useState<FilledPdfGenerationState>(idleFilledPdfState)
  const filledPdfRequestIdRef = useRef(0)

  const handleLoadStarted = useCallback(() => {
    dispatch({ type: 'template/loadStarted' })
  }, [])

  const handleLoadSucceeded = useCallback(
    (loadedTemplate: LoadedPdfTemplate) => {
      const importedFields = createAcroFormDraftFields(
        loadedTemplate.importedFields,
      )
      const knownProfile = findKnownTemplateProfile(
        loadedTemplate.session.sha256,
      )

      dispatch({
        type: 'template/loadSucceeded',
        session: loadedTemplate.session,
      })
      dispatch({
        type: 'fields/imported',
        fields: importedFields,
      })

      if (knownProfile !== undefined) {
        dispatch({
          type: 'form/metadataChanged',
          metadata: {
            formId: knownProfile.form.formId,
            title: knownProfile.form.title,
            taxYear: knownProfile.form.taxYear,
            revision: knownProfile.form.revision,
          },
        })
        dispatch({
          type: 'dataContract/changed',
          dataContract: knownProfile.dataContract,
        })
      }

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

  const loadSampleDataset = async (
    fileName: string,
    readSourceText: () => Promise<string>,
  ) => {
    dispatch({ type: 'dataset/loadStarted' })

    try {
      const value = parseJsonDataset(await readSourceText())
      dispatch({
        type: 'dataset/loaded',
        session: { fileName, value },
      })
    } catch (error: unknown) {
      dispatch({
        type: 'dataset/loadFailed',
        errorMessage: getErrorMessage(error),
      })
    }
  }

  const handleBundledDatasetLoad = () => {
    void loadSampleDataset(bundledDatasetFileName, async () => {
      const response = await fetch(bundledDatasetUrl)

      if (!response.ok) {
        throw new Error('The included sample dataset could not be loaded.')
      }

      return response.text()
    })
  }

  const handleDatasetFileSelected = (file: File) => {
    void loadSampleDataset(file.name, () => file.text())
  }

  const currentPage = editorState.ui.currentPage
  const currentPageFields = selectCurrentPageFields(editorState)
  const selectedField = selectSelectedField(editorState)
  const previewFields = selectPreviewFields(editorState)
  const datasetSession = editorState.sampleDataset.session
  const template = editorState.template
  const isPreviewEnabled =
    editorState.ui.previewEnabled &&
    datasetSession !== null &&
    previewFields.length > 0
  const previewResult =
    isPreviewEnabled && datasetSession !== null
      ? resolveRenderValuesForFields(
          previewFields,
          editorState.draft.defaults,
          datasetSession.value,
        )
      : { values: [], diagnostics: [], hasErrors: false }
  const previewDiagnostics =
    isPreviewEnabled && datasetSession !== null
      ? [
          ...validateDatasetContract(
            editorState.draft.dataContract,
            datasetSession.value,
          ),
          ...previewResult.diagnostics,
        ]
      : []
  const currentPagePreviewValues = previewResult.values.filter(
    (value) => value.page === currentPage,
  )
  const knownTemplateProfile =
    template === null ? undefined : findKnownTemplateProfile(template.sha256)
  const automaticFieldMappings = useMemo(
    () =>
      knownTemplateProfile === undefined
        ? []
        : findAutomaticFieldMappings(
            editorState.draft.fields,
            knownTemplateProfile.fields,
          ),
    [editorState.draft.fields, knownTemplateProfile],
  )
  const mappingCounts = countFieldsByMappingStatus(editorState.draft.fields)
  const isAutomaticMappingDatasetCompatible =
    knownTemplateProfile !== undefined &&
    datasetSession !== null &&
    editorState.draft.dataContract.id ===
      knownTemplateProfile.dataContract.id &&
    editorState.draft.dataContract.version ===
      knownTemplateProfile.dataContract.version &&
    !validateDatasetContract(
      knownTemplateProfile.dataContract,
      datasetSession.value,
    ).some(({ severity }) => severity === 'error')
  const hasDuplicateSelectedId =
    selectedField?.id !== undefined &&
    editorState.draft.fields.some(
      (field) =>
        field.draftId !== selectedField.draftId &&
        field.id === selectedField.id,
    )
  const annotationCandidate = useMemo(
    () => createAnnotationCandidate(editorState.draft),
    [editorState.draft],
  )
  const annotationReadiness = useMemo(
    () =>
      evaluateAnnotationReadiness({
        draft: editorState.draft,
        candidate: annotationCandidate,
        template: template ?? undefined,
        dataset: datasetSession?.value,
      }),
    [annotationCandidate, datasetSession, editorState.draft, template],
  )
  const currentFilledPdfInputRef = useRef({
    annotationCandidate,
    datasetSession,
    template,
  })
  useEffect(() => {
    currentFilledPdfInputRef.current = {
      annotationCandidate,
      datasetSession,
      template,
    }
    filledPdfRequestIdRef.current += 1
  }, [annotationCandidate, datasetSession, template])
  const displayedFilledPdfState = isCurrentFilledPdfState(
    filledPdfState,
    annotationCandidate,
    template,
    datasetSession,
  )
    ? filledPdfState
    : idleFilledPdfState
  const isLoading = editorState.templateLoad.status === 'loading'
  const pageCount = template?.pages.length ?? 0
  const importWarnings = editorState.diagnostics.filter(
    ({ severity }) => severity === 'warning',
  )

  const handleDiagnosticSelected = (diagnostic: Diagnostic) => {
    if (diagnostic.page !== undefined) {
      dispatch({ type: 'ui/pageChanged', pageNumber: diagnostic.page })
    }

    if (diagnostic.draftId !== undefined) {
      dispatch({ type: 'field/selected', draftId: diagnostic.draftId })
    }
  }

  const handleAutomaticFieldMapping = () => {
    if (!isAutomaticMappingDatasetCompatible) {
      return
    }

    dispatch({
      type: 'fields/automaticallyMapped',
      mappings: automaticFieldMappings,
    })
  }

  const handleAnnotationExport = () => {
    if (
      !annotationReadiness.isExportReady ||
      annotationReadiness.candidate === null
    ) {
      return
    }

    const annotationFile = createAnnotationJsonFile(
      annotationReadiness.candidate,
    )
    downloadBlob(
      new Blob([annotationFile.contents], {
        type: ANNOTATION_JSON_MIME_TYPE,
      }),
      annotationFile.fileName,
    )
    dispatch({ type: 'editor/saved' })
  }

  const handleFilledPdfGeneration = async () => {
    if (
      !annotationReadiness.isExportReady ||
      annotationReadiness.candidate === null ||
      template === null ||
      datasetSession === null
    ) {
      return
    }

    const requestId = filledPdfRequestIdRef.current + 1
    filledPdfRequestIdRef.current = requestId
    const source: FilledPdfGenerationSource = {
      annotation: annotationReadiness.candidate,
      template,
      dataset: datasetSession,
    }
    setFilledPdfState({
      status: 'generating',
      diagnostics: [],
      downloadedFileName: null,
      source,
    })

    try {
      const { generateFilledPdf } = await import(
        './pdf/filled-pdf-renderer'
      )
      const result = await generateFilledPdf({
        annotation: annotationReadiness.candidate,
        templateBytes: template.bytes,
        dataset: datasetSession.value,
      })

      if (
        filledPdfRequestIdRef.current !== requestId ||
        !isCurrentFilledPdfSource(source, currentFilledPdfInputRef.current)
      ) {
        return
      }

      if (result.status === 'error') {
        setFilledPdfState({
          status: 'error',
          diagnostics: result.diagnostics,
          downloadedFileName: null,
          source,
        })
        return
      }

      const fileName = createFormArtifactFileName(
        annotationReadiness.candidate.form,
        'filled.pdf',
      )
      downloadBlob(
        new Blob([copyUint8ArrayToArrayBuffer(result.bytes)], {
          type: 'application/pdf',
        }),
        fileName,
      )
      setFilledPdfState({
        status: 'ready',
        diagnostics: result.diagnostics,
        downloadedFileName: fileName,
        source,
      })
    } catch {
      if (
        filledPdfRequestIdRef.current !== requestId ||
        !isCurrentFilledPdfSource(source, currentFilledPdfInputRef.current)
      ) {
        return
      }

      setFilledPdfState({
        status: 'error',
        diagnostics: [
          {
            severity: 'error',
            code: 'PDF_GENERATION_FAILED',
            message: 'The filled PDF could not be generated.',
          },
        ],
        downloadedFileName: null,
        source,
      })
    }
  }

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
            <nav className="field-rail" aria-label="Page fields">
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

                <FieldMappingActions
                  mappedFieldCount={mappingCounts.mapped}
                  unmappedFieldCount={mappingCounts.unmapped}
                  invalidFieldCount={mappingCounts.invalid}
                  automaticMappingCount={automaticFieldMappings.length}
                  hasKnownTemplateProfile={
                    knownTemplateProfile !== undefined
                  }
                  hasDataset={datasetSession !== null}
                  isDatasetCompatible={
                    isAutomaticMappingDatasetCompatible
                  }
                  onAutoMap={handleAutomaticFieldMapping}
                  onExcludeUnmapped={() =>
                    dispatch({ type: 'fields/unmappedExcluded' })
                  }
                />

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
                            {field.label ??
                              shortenFieldName(
                                field.originalPdfFieldName ?? field.draftId,
                              )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </nav>

            <PdfWorkspace
              key={`${template.sha256}:${currentPage}`}
              document={document}
              pageNumber={currentPage}
              fields={currentPageFields}
              zoom={editorState.ui.zoom}
              activeTool={editorState.ui.activeTool}
              selectedDraftId={editorState.ui.selectedDraftId}
              pendingSelection={editorState.ui.pendingSelection}
              previewValues={currentPagePreviewValues}
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

              <FormMetadataEditor
                form={editorState.draft.form}
                dataContract={editorState.draft.dataContract}
                onFormChanged={(metadata) =>
                  dispatch({ type: 'form/metadataChanged', metadata })
                }
                onDataContractChanged={(dataContract) =>
                  dispatch({ type: 'dataContract/changed', dataContract })
                }
              />

              <AnnotationDefaultsEditor
                defaults={editorState.draft.defaults}
                onStyleChanged={(style) =>
                  dispatch({ type: 'defaults/styleChanged', style })
                }
                onBehaviorChanged={(behavior) =>
                  dispatch({ type: 'defaults/behaviorChanged', behavior })
                }
              />

              <ValidationPanel
                result={annotationReadiness}
                onDiagnosticSelected={handleDiagnosticSelected}
                onExport={handleAnnotationExport}
              />

              <DataPreviewPanel
                dataset={editorState.sampleDataset}
                previewEnabled={isPreviewEnabled}
                mappedFieldCount={previewFields.length}
                renderedValueCount={previewResult.values.length}
                diagnostics={previewDiagnostics}
                onBundledSampleLoad={handleBundledDatasetLoad}
                onFileSelected={handleDatasetFileSelected}
                onPreviewChanged={(enabled) =>
                  dispatch({ type: 'ui/previewChanged', enabled })
                }
                onClear={() => dispatch({ type: 'dataset/cleared' })}
              />

              <FilledPdfPanel
                status={displayedFilledPdfState.status}
                canGenerate={
                  annotationReadiness.isExportReady && datasetSession !== null
                }
                hasDataset={datasetSession !== null}
                downloadedFileName={
                  displayedFilledPdfState.downloadedFileName
                }
                diagnostics={displayedFilledPdfState.diagnostics}
                onGenerate={() => void handleFilledPdfGeneration()}
              />

              {selectedField === undefined ? null : (
                <FieldInspector
                  key={selectedField.draftId}
                  field={selectedField}
                  defaultStyle={editorState.draft.defaults.style}
                  defaultBehavior={editorState.draft.defaults.behavior}
                  hasDuplicateId={hasDuplicateSelectedId}
                  onMappingChanged={(mapping) =>
                    dispatch({
                      type: 'field/mappingChanged',
                      draftId: selectedField.draftId,
                      mapping,
                    })
                  }
                  onBoxChanged={(box) =>
                    dispatch({
                      type: 'field/boxChanged',
                      draftId: selectedField.draftId,
                      box,
                    })
                  }
                  onStyleChanged={(style) =>
                    dispatch({
                      type: 'field/styleChanged',
                      draftId: selectedField.draftId,
                      style,
                    })
                  }
                  onBehaviorChanged={(behavior) =>
                    dispatch({
                      type: 'field/behaviorChanged',
                      draftId: selectedField.draftId,
                      behavior,
                    })
                  }
                  onRemove={() =>
                    dispatch({
                      type: 'field/removed',
                      draftId: selectedField.draftId,
                    })
                  }
                />
              )}

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

/*
 * AcroForm names share a long container prefix such as
 * `topmostSubform[0].Page1[0].`, so a left-anchored list truncates every row to
 * the same unreadable text. Only the trailing segment distinguishes one widget
 * from another; the full name stays available as the row's title attribute.
 */
function shortenFieldName(fieldName: string): string {
  const segments = fieldName.split('.')
  return segments[segments.length - 1] || fieldName
}

function shortenChecksum(checksum: string): string {
  return `${checksum.slice(0, 10)}…${checksum.slice(-8)}`
}

function countFieldsByMappingStatus(fields: DraftFieldAnnotation[]) {
  return fields.reduce(
    (counts, field) => ({
      ...counts,
      [field.mappingStatus]: counts[field.mappingStatus] + 1,
    }),
    { mapped: 0, unmapped: 0, invalid: 0 },
  )
}

export default App

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The sample dataset could not be loaded.'
}

function copyUint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function isCurrentFilledPdfState(
  state: FilledPdfGenerationState,
  annotation: AnnotationDocument | null,
  template: TemplateSession | null,
  dataset: SampleDatasetSession | null,
): boolean {
  return (
    state.source === null ||
    (state.source.annotation === annotation &&
      state.source.template === template &&
      state.source.dataset === dataset)
  )
}

function isCurrentFilledPdfSource(
  source: FilledPdfGenerationSource,
  currentInput: {
    annotationCandidate: AnnotationDocument | null
    template: TemplateSession | null
    datasetSession: SampleDatasetSession | null
  },
): boolean {
  return (
    source.annotation === currentInput.annotationCandidate &&
    source.template === currentInput.template &&
    source.dataset === currentInput.datasetSession
  )
}
