import type { FormMetadata } from '../domain/annotation-types'

export type FormArtifactSuffix = 'annotation.json' | 'filled.pdf'

export function createFormArtifactFileName(
  form: FormMetadata,
  suffix: FormArtifactSuffix,
): string {
  return `${toSafeFileNameToken(form.formId)}-${form.taxYear}.${suffix}`
}

function toSafeFileNameToken(value: string): string {
  const token = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/gu, '-')
    .replaceAll(/^[._-]+|[._-]+$/gu, '')

  return token || 'tax-form'
}
