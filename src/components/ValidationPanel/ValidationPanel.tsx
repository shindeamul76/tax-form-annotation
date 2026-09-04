import type { AnnotationReadinessResult } from '../../app/evaluate-annotation-readiness'
import type { Diagnostic } from '../../domain/diagnostics'
import './ValidationPanel.css'

const MAXIMUM_VISIBLE_DIAGNOSTICS = 20

interface ValidationPanelProps {
  result: AnnotationReadinessResult
  onDiagnosticSelected: (diagnostic: Diagnostic) => void
  onExport: () => void
}

export function ValidationPanel({
  result,
  onDiagnosticSelected,
  onExport,
}: ValidationPanelProps) {
  const errorCount = countDiagnostics(result.diagnostics, 'error')
  const warningCount = countDiagnostics(result.diagnostics, 'warning')
  const visibleDiagnostics = result.diagnostics.slice(
    0,
    MAXIMUM_VISIBLE_DIAGNOSTICS,
  )
  const hiddenDiagnosticCount =
    result.diagnostics.length - visibleDiagnostics.length

  return (
    <section
      className="sidebar-card validation-panel"
      aria-labelledby="validation-panel-heading"
    >
      <div className="sidebar-card__heading">
        <div>
          <h3 id="validation-panel-heading">Export readiness</h3>
          <p>Validation runs from the canonical annotation draft.</p>
        </div>
        <span
          className={`validation-status validation-status--${result.isExportReady ? 'ready' : 'blocked'}`}
          role="status"
        >
          {result.isExportReady ? 'Ready' : 'Blocked'}
        </span>
      </div>

      <ol className="validation-stage-list" aria-label="Validation stages">
        {result.stages.map((stage) => (
          <li key={stage.id} data-status={stage.status}>
            <span aria-hidden="true">{getStageSymbol(stage.status)}</span>
            <span>{stage.label}</span>
            <strong>{formatStageStatus(stage.status)}</strong>
          </li>
        ))}
      </ol>

      <div className="validation-counts">
        <span>{errorCount} errors</span>
        <span>{warningCount} warnings</span>
      </div>

      {result.isExportReady ? (
        <p className="validation-ready-message">
          The annotation can be serialized and exported.
        </p>
      ) : null}

      {visibleDiagnostics.length > 0 ? (
        <DiagnosticList
          diagnostics={visibleDiagnostics}
          hiddenDiagnosticCount={hiddenDiagnosticCount}
          onDiagnosticSelected={onDiagnosticSelected}
        />
      ) : null}

      <button
        className="validation-export-button"
        type="button"
        disabled={!result.isExportReady}
        onClick={onExport}
      >
        Download annotation JSON
      </button>
    </section>
  )
}

interface DiagnosticListProps {
  diagnostics: Diagnostic[]
  hiddenDiagnosticCount: number
  onDiagnosticSelected: (diagnostic: Diagnostic) => void
}

function DiagnosticList({
  diagnostics,
  hiddenDiagnosticCount,
  onDiagnosticSelected,
}: DiagnosticListProps) {
  return (
    <div>
      <ul className="validation-diagnostic-list" aria-label="Export issues">
        {diagnostics.map((diagnostic, diagnosticIndex) => (
          <li
            key={`${diagnostic.code}:${diagnostic.path ?? ''}:${diagnosticIndex}`}
            data-severity={diagnostic.severity}
          >
            {diagnostic.draftId === undefined ? (
              <DiagnosticContent diagnostic={diagnostic} />
            ) : (
              <button
                type="button"
                onClick={() => onDiagnosticSelected(diagnostic)}
              >
                <DiagnosticContent diagnostic={diagnostic} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {hiddenDiagnosticCount > 0 ? (
        <p className="validation-hidden-count">
          {hiddenDiagnosticCount} additional issues are not shown.
        </p>
      ) : null}
    </div>
  )
}

function DiagnosticContent({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
    <>
      <strong>{diagnostic.message}</strong>
      <span>{formatDiagnosticLocation(diagnostic)}</span>
    </>
  )
}

function formatDiagnosticLocation(diagnostic: Diagnostic): string {
  const parts = [
    diagnostic.page === undefined ? undefined : `Page ${diagnostic.page}`,
    diagnostic.path,
  ].filter((part): part is string => part !== undefined)

  return parts.length === 0 ? diagnostic.code : parts.join(' · ')
}

function countDiagnostics(
  diagnostics: Diagnostic[],
  severity: Diagnostic['severity'],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length
}

function getStageSymbol(
  status: AnnotationReadinessResult['stages'][number]['status'],
): string {
  switch (status) {
    case 'passed':
      return '✓'
    case 'failed':
      return '!'
    case 'not-run':
      return '–'
  }
}

function formatStageStatus(
  status: AnnotationReadinessResult['stages'][number]['status'],
): string {
  if (status === 'not-run') {
    return 'Not run'
  }

  return status === 'passed' ? 'Passed' : 'Failed'
}
