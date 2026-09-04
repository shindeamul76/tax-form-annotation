import form10402025ProfileJson from '../../examples/annotations/form-1040-2025.annotation.json'
import { validateAnnotationSchema } from '../domain/annotation-schema-validation'
import type { AnnotationDocument } from '../domain/annotation-types'

const form10402025Profile = parseBundledProfile(form10402025ProfileJson)

export function findKnownTemplateProfile(
  templateSha256: string,
): AnnotationDocument | undefined {
  return form10402025Profile.form.templateSha256 === templateSha256
    ? form10402025Profile
    : undefined
}

function parseBundledProfile(value: unknown): AnnotationDocument {
  const diagnostics = validateAnnotationSchema(value)

  if (diagnostics.some(({ severity }) => severity === 'error')) {
    throw new Error('The bundled Form 1040 mapping profile is invalid.')
  }

  return value as AnnotationDocument
}
