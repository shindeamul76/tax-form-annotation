import type {
  AnnotationDefaults,
  AnnotationDocument,
  FieldAnnotation,
  FieldBehavior,
  FieldBehaviorOverride,
  FieldStyle,
  FieldStyleOverride,
  JsonValue,
  MissingValueBehavior,
  NormalizedBox,
} from './annotation-types'
import type { Diagnostic, DiagnosticSeverity } from './diagnostics'
import { formatFieldValue } from './field-format'
import { resolveJsonPointer } from './json-pointer'

export interface RenderValue {
  fieldId: string
  page: number
  text: string
  box: NormalizedBox
  style: FieldStyle
}

export interface ResolveRenderValueInput {
  field: FieldAnnotation
  defaults: AnnotationDefaults
  dataset: JsonValue
}

export type RenderValueResult =
  | RenderValueReady
  | RenderValueSkipped
  | RenderValueError

export interface RenderValueReady {
  status: 'ready'
  value: RenderValue
}

export interface RenderValueSkipped {
  status: 'skipped'
  diagnostics: Diagnostic[]
}

export interface RenderValueError {
  status: 'error'
  diagnostics: Diagnostic[]
}

export interface RenderValuesResult {
  values: RenderValue[]
  diagnostics: Diagnostic[]
  hasErrors: boolean
}

export function resolveRenderValue({
  field,
  defaults,
  dataset,
}: ResolveRenderValueInput): RenderValueResult {
  const style = resolveFieldStyle(defaults.style, field.style)
  const behavior = resolveFieldBehavior(defaults.behavior, field.behavior)
  const sourceResolution = resolveSourceValue(field, dataset)

  if (sourceResolution.status === 'invalid') {
    return createRenderError(
      createFieldDiagnostic({
        field,
        severity: 'error',
        code: 'FIELD_POINTER_INVALID',
        message: 'The source path is not a valid JSON Pointer.',
        path: sourceResolution.pointer,
      }),
    )
  }

  if (sourceResolution.status === 'missing') {
    return applyUnavailableValueBehavior({
      field,
      behavior: behavior.onMissing,
      code: 'FIELD_POINTER_MISSING',
      message: 'The source path does not exist in the dataset.',
      path: sourceResolution.pointer,
    })
  }

  if (sourceResolution.value === null) {
    return applyUnavailableValueBehavior({
      field,
      behavior: behavior.onNull,
      code: 'FIELD_VALUE_NULL',
      message: 'The source value is null.',
      path: sourceResolution.pointer,
    })
  }

  if (
    typeof sourceResolution.value === 'number' &&
    sourceResolution.value === 0 &&
    !behavior.printZero
  ) {
    return { status: 'skipped', diagnostics: [] }
  }

  const formatResult = formatFieldValue(sourceResolution.value, field.format)

  if (formatResult.status === 'error') {
    return createRenderError({
      ...formatResult.diagnostic,
      fieldId: field.id,
      page: field.page,
      ...(sourceResolution.pointer === undefined
        ? {}
        : { path: sourceResolution.pointer }),
    })
  }

  return {
    status: 'ready',
    value: {
      fieldId: field.id,
      page: field.page,
      text: formatResult.text,
      box: field.box,
      style,
    },
  }
}

export function resolveRenderValues(
  annotation: AnnotationDocument,
  dataset: JsonValue,
): RenderValuesResult {
  const values: RenderValue[] = []
  const diagnostics: Diagnostic[] = []

  for (const field of annotation.fields) {
    const result = resolveRenderValue({
      field,
      defaults: annotation.defaults,
      dataset,
    })

    if (result.status === 'ready') {
      values.push(result.value)
    } else {
      diagnostics.push(...result.diagnostics)
    }
  }

  return {
    values,
    diagnostics,
    hasErrors: diagnostics.some(({ severity }) => severity === 'error'),
  }
}

export function resolveFieldStyle(
  defaultStyle: FieldStyle,
  override?: FieldStyleOverride,
): FieldStyle {
  return { ...defaultStyle, ...override }
}

export function resolveFieldBehavior(
  defaultBehavior: FieldBehavior,
  override?: FieldBehaviorOverride,
): FieldBehavior {
  return { ...defaultBehavior, ...override }
}

interface ResolvedSourceValue {
  status: 'resolved'
  value: JsonValue
  pointer?: string
}

interface MissingSourceValue {
  status: 'missing'
  pointer: string
}

interface InvalidSourceValue {
  status: 'invalid'
  pointer: string
}

type SourceValueResolution =
  | ResolvedSourceValue
  | MissingSourceValue
  | InvalidSourceValue

function resolveSourceValue(
  field: FieldAnnotation,
  dataset: JsonValue,
): SourceValueResolution {
  if (field.source.kind === 'constant') {
    return { status: 'resolved', value: field.source.value }
  }

  const pointerResult = resolveJsonPointer(dataset, field.source.pointer)

  if (pointerResult.status === 'found') {
    return {
      status: 'resolved',
      value: pointerResult.value,
      pointer: pointerResult.pointer,
    }
  }

  return {
    status: pointerResult.status,
    pointer: pointerResult.pointer,
  }
}

interface UnavailableValueInput {
  field: FieldAnnotation
  behavior: MissingValueBehavior
  code: string
  message: string
  path?: string
}

function applyUnavailableValueBehavior({
  field,
  behavior,
  code,
  message,
  path,
}: UnavailableValueInput): RenderValueSkipped | RenderValueError {
  if (behavior === 'blank') {
    return { status: 'skipped', diagnostics: [] }
  }

  const diagnostic = createFieldDiagnostic({
    field,
    severity: behavior === 'warn' ? 'warning' : 'error',
    code,
    message,
    path,
  })

  return behavior === 'warn'
    ? { status: 'skipped', diagnostics: [diagnostic] }
    : { status: 'error', diagnostics: [diagnostic] }
}

interface FieldDiagnosticInput {
  field: FieldAnnotation
  severity: DiagnosticSeverity
  code: string
  message: string
  path?: string
}

function createFieldDiagnostic({
  field,
  severity,
  code,
  message,
  path,
}: FieldDiagnosticInput): Diagnostic {
  return {
    severity,
    code,
    message,
    fieldId: field.id,
    page: field.page,
    ...(path === undefined ? {} : { path }),
  }
}

function createRenderError(diagnostic: Diagnostic): RenderValueError {
  return { status: 'error', diagnostics: [diagnostic] }
}
