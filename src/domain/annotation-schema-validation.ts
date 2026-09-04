import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js'
import annotationSchema from '../../schemas/annotation.schema.json'
import type { Diagnostic } from './diagnostics'

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
})
const validateAnnotationDocument = ajv.compile(annotationSchema)

export function validateAnnotationSchema(value: unknown): Diagnostic[] {
  if (validateAnnotationDocument(value)) {
    return []
  }

  return (validateAnnotationDocument.errors ?? []).map(toSchemaDiagnostic)
}

function toSchemaDiagnostic(error: ErrorObject): Diagnostic {
  const path = getSchemaErrorPath(error)

  return {
    severity: 'error',
    code: `SCHEMA_${toUpperSnakeCase(error.keyword)}`,
    message: formatSchemaErrorMessage(error),
    path,
  }
}

function getSchemaErrorPath(error: ErrorObject): string {
  if (error.keyword === 'required') {
    const missingProperty = String(error.params.missingProperty)
    return `${error.instancePath}/${escapeJsonPointerToken(missingProperty)}`
  }

  if (error.keyword === 'additionalProperties') {
    const propertyName = String(error.params.additionalProperty)
    return `${error.instancePath}/${escapeJsonPointerToken(propertyName)}`
  }

  return error.instancePath || '/'
}

function formatSchemaErrorMessage(error: ErrorObject): string {
  if (error.keyword === 'required') {
    return `Required property "${String(error.params.missingProperty)}" is missing.`
  }

  if (error.keyword === 'additionalProperties') {
    return `Property "${String(error.params.additionalProperty)}" is not allowed by the annotation schema.`
  }

  return `Value at ${error.instancePath || '/'} ${error.message ?? 'is invalid'}.`
}

function escapeJsonPointerToken(token: string): string {
  return token.replaceAll('~', '~0').replaceAll('/', '~1')
}

function toUpperSnakeCase(value: string): string {
  return value.replaceAll(/([a-z])([A-Z])/gu, '$1_$2').toUpperCase()
}
