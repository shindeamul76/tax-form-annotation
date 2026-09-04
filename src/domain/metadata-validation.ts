import type { DraftFormMetadata } from './annotation-draft'
import type { DataContract } from './annotation-types'
import type { Diagnostic } from './diagnostics'

const stableIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u
const contractVersionPattern = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u

export function validateDraftMetadata(
  form: DraftFormMetadata,
  dataContract: DataContract,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  if (form.formId === undefined || !stableIdentifierPattern.test(form.formId)) {
    diagnostics.push(
      createMetadataDiagnostic(
        'FORM_ID_INVALID',
        'Enter a form ID using letters, numbers, periods, underscores, or hyphens.',
        '/form/formId',
      ),
    )
  }

  if (!isNonBlank(form.title)) {
    diagnostics.push(
      createMetadataDiagnostic(
        'FORM_TITLE_REQUIRED',
        'Enter a human-readable form title.',
        '/form/title',
      ),
    )
  }

  if (
    form.taxYear === undefined ||
    !Number.isInteger(form.taxYear) ||
    form.taxYear < 1900 ||
    form.taxYear > 9999
  ) {
    diagnostics.push(
      createMetadataDiagnostic(
        'FORM_TAX_YEAR_INVALID',
        'Enter a four-digit tax year of 1900 or later.',
        '/form/taxYear',
      ),
    )
  }

  if (!isNonBlank(form.revision)) {
    diagnostics.push(
      createMetadataDiagnostic(
        'FORM_REVISION_REQUIRED',
        'Enter the exact form revision.',
        '/form/revision',
      ),
    )
  }

  if (!stableIdentifierPattern.test(dataContract.id)) {
    diagnostics.push(
      createMetadataDiagnostic(
        'DATA_CONTRACT_ID_INVALID',
        'Enter a stable data-contract ID.',
        '/dataContract/id',
      ),
    )
  }

  if (!contractVersionPattern.test(dataContract.version)) {
    diagnostics.push(
      createMetadataDiagnostic(
        'DATA_CONTRACT_VERSION_INVALID',
        'Enter the data-contract version as major.minor, such as 1.0.',
        '/dataContract/version',
      ),
    )
  }

  return diagnostics
}

function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0
}

function createMetadataDiagnostic(
  code: string,
  message: string,
  path: string,
): Diagnostic {
  return { severity: 'error', code, message, path }
}
