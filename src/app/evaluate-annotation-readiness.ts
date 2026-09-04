import type { AnnotationDraft } from '../domain/annotation-draft'
import { validateAnnotationDraft } from '../domain/annotation-draft-validation'
import { validateAnnotationSchema } from '../domain/annotation-schema-validation'
import type {
  AnnotationDocument,
  JsonValue,
} from '../domain/annotation-types'
import type { Diagnostic } from '../domain/diagnostics'
import type { LoadedTemplateMetadata } from '../domain/template-types'
import { validateAnnotationSemantics } from '../domain/validation'

export type ValidationStageStatus = 'passed' | 'failed' | 'not-run'

export interface ValidationStageResult {
  id: 'draft' | 'schema' | 'semantics'
  label: string
  status: ValidationStageStatus
}

export interface AnnotationReadinessResult {
  candidate: AnnotationDocument | null
  diagnostics: Diagnostic[]
  stages: ValidationStageResult[]
  isExportReady: boolean
}

interface EvaluateAnnotationReadinessInput {
  draft: AnnotationDraft
  candidate: AnnotationDocument | null
  template?: LoadedTemplateMetadata
  dataset?: JsonValue
}

export function evaluateAnnotationReadiness({
  draft,
  candidate,
  template,
  dataset,
}: EvaluateAnnotationReadinessInput): AnnotationReadinessResult {
  const draftDiagnostics = validateAnnotationDraft(draft)

  if (hasErrors(draftDiagnostics)) {
    return createBlockedResult(candidate, draftDiagnostics, [
      createStage('draft', 'Draft completeness', 'failed'),
      createStage('schema', 'JSON Schema', 'not-run'),
      createStage('semantics', 'Semantic checks', 'not-run'),
    ])
  }

  if (candidate === null) {
    const diagnostics: Diagnostic[] = [
      ...draftDiagnostics,
      {
        severity: 'error',
        code: 'ANNOTATION_CANDIDATE_UNAVAILABLE',
        message: 'The completed draft could not be converted for export.',
      },
    ]

    return createBlockedResult(candidate, diagnostics, [
      createStage('draft', 'Draft completeness', 'passed'),
      createStage('schema', 'JSON Schema', 'not-run'),
      createStage('semantics', 'Semantic checks', 'not-run'),
    ])
  }

  const schemaDiagnostics = addDraftNavigation(
    validateAnnotationSchema(candidate),
    draft,
  )

  if (hasErrors(schemaDiagnostics)) {
    return createBlockedResult(
      candidate,
      [...draftDiagnostics, ...schemaDiagnostics],
      [
        createStage('draft', 'Draft completeness', 'passed'),
        createStage('schema', 'JSON Schema', 'failed'),
        createStage('semantics', 'Semantic checks', 'not-run'),
      ],
    )
  }

  const semanticDiagnostics = addDraftNavigation(
    validateAnnotationSemantics(candidate, { template, dataset }).diagnostics,
    draft,
  )
  const diagnostics = [
    ...draftDiagnostics,
    ...schemaDiagnostics,
    ...semanticDiagnostics,
  ]
  const semanticStatus = hasErrors(semanticDiagnostics) ? 'failed' : 'passed'
  const stages: ValidationStageResult[] = [
    createStage('draft', 'Draft completeness', 'passed'),
    createStage('schema', 'JSON Schema', 'passed'),
    createStage('semantics', 'Semantic checks', semanticStatus),
  ]

  return {
    candidate,
    diagnostics,
    stages,
    isExportReady: !hasErrors(diagnostics),
  }
}

function createBlockedResult(
  candidate: AnnotationDocument | null,
  diagnostics: Diagnostic[],
  stages: ValidationStageResult[],
): AnnotationReadinessResult {
  return { candidate, diagnostics, stages, isExportReady: false }
}

function createStage(
  id: ValidationStageResult['id'],
  label: string,
  status: ValidationStageStatus,
): ValidationStageResult {
  return { id, label, status }
}

function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(({ severity }) => severity === 'error')
}

function addDraftNavigation(
  diagnostics: Diagnostic[],
  draft: AnnotationDraft,
): Diagnostic[] {
  return diagnostics.map((diagnostic) => {
    const draftField = findDiagnosticDraftField(diagnostic, draft)

    return draftField === undefined
      ? diagnostic
      : {
          ...diagnostic,
          draftId: draftField.draftId,
          fieldId: diagnostic.fieldId ?? draftField.id,
          page: diagnostic.page ?? draftField.page,
        }
  })
}

function findDiagnosticDraftField(
  diagnostic: Diagnostic,
  draft: AnnotationDraft,
) {
  if (diagnostic.fieldId !== undefined) {
    return draft.fields.find(({ id }) => id === diagnostic.fieldId)
  }

  const fieldIndexMatch = diagnostic.path?.match(/^\/fields\/(\d+)(?:\/|$)/u)

  if (fieldIndexMatch === undefined || fieldIndexMatch === null) {
    return undefined
  }

  return draft.fields[Number(fieldIndexMatch[1])]
}
