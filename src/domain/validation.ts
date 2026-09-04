import type {
  AnnotationDocument,
  DataContract,
  FieldAnnotation,
  JsonObject,
  JsonValue,
  PageMetadata,
} from './annotation-types'
import { isNormalizedBoxWithinPage } from './coordinates'
import type { Diagnostic } from './diagnostics'
import { resolveFieldStyle, resolveRenderValues } from './render-values'
import type {
  LoadedTemplateMetadata,
  LoadedTemplatePageMetadata,
} from './template-types'

export type {
  LoadedTemplateMetadata,
  LoadedTemplatePageMetadata,
} from './template-types'

export const TEMPLATE_PAGE_SIZE_TOLERANCE_PT = 0.01

export interface AnnotationValidationContext {
  dataset?: JsonValue
  template?: LoadedTemplateMetadata
}

export interface SemanticValidationResult {
  diagnostics: Diagnostic[]
  isValid: boolean
}

export function validateAnnotationSemantics(
  annotation: AnnotationDocument,
  context: AnnotationValidationContext = {},
): SemanticValidationResult {
  const diagnostics = [
    ...validateDeclaredPages(annotation.form.pages),
    ...validateFields(annotation),
  ]

  if (context.template !== undefined) {
    diagnostics.push(...validateTemplate(annotation, context.template))
  }

  if (context.dataset !== undefined) {
    diagnostics.push(
      ...validateDatasetContract(annotation.dataContract, context.dataset),
      ...resolveRenderValues(annotation, context.dataset).diagnostics,
    )
  }

  return {
    diagnostics,
    isValid: !diagnostics.some(({ severity }) => severity === 'error'),
  }
}

function validateDeclaredPages(pages: PageMetadata[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const seenPageNumbers = new Set<number>()

  for (const [pageIndex, page] of pages.entries()) {
    if (seenPageNumbers.has(page.pageNumber)) {
      diagnostics.push({
        severity: 'error',
        code: 'DUPLICATE_PAGE_NUMBER',
        message: `Page number ${page.pageNumber} must be unique.`,
        page: page.pageNumber,
        path: `/form/pages/${pageIndex}/pageNumber`,
      })
    } else {
      seenPageNumbers.add(page.pageNumber)
    }
  }

  return diagnostics
}

function validateFields(annotation: AnnotationDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const declaredPageNumbers = new Set(
    annotation.form.pages.map(({ pageNumber }) => pageNumber),
  )
  const seenFieldIds = new Set<string>()

  for (const [fieldIndex, field] of annotation.fields.entries()) {
    const fieldPath = `/fields/${fieldIndex}`

    if (seenFieldIds.has(field.id)) {
      diagnostics.push(
        createFieldError(
          field,
          'DUPLICATE_FIELD_ID',
          `Field ID "${field.id}" must be unique.`,
          `${fieldPath}/id`,
        ),
      )
    } else {
      seenFieldIds.add(field.id)
    }

    if (!declaredPageNumbers.has(field.page)) {
      diagnostics.push(
        createFieldError(
          field,
          'FIELD_PAGE_NOT_FOUND',
          `Page ${field.page} is not declared in the form metadata.`,
          `${fieldPath}/page`,
        ),
      )
    }

    if (!isNormalizedBoxWithinPage(field.box)) {
      diagnostics.push(
        createFieldError(
          field,
          'BOX_OUT_OF_BOUNDS',
          'The normalized field box must remain completely inside the page.',
          `${fieldPath}/box`,
        ),
      )
    }

    const effectiveStyle = resolveFieldStyle(annotation.defaults.style, field.style)

    if (effectiveStyle.minimumFontSizePt > effectiveStyle.fontSizePt) {
      diagnostics.push(
        createFieldError(
          field,
          'MINIMUM_FONT_SIZE_EXCEEDS_FONT_SIZE',
          'minimumFontSizePt cannot exceed fontSizePt after style inheritance.',
          `${fieldPath}/style/minimumFontSizePt`,
        ),
      )
    }
  }

  return diagnostics
}

function validateTemplate(
  annotation: AnnotationDocument,
  template: LoadedTemplateMetadata,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  if (template.fileName !== annotation.form.templateFile) {
    diagnostics.push({
      severity: 'error',
      code: 'TEMPLATE_FILENAME_MISMATCH',
      message: 'The loaded PDF filename does not match form.templateFile.',
      path: '/form/templateFile',
    })
  }

  if (
    annotation.form.templateSha256 !== undefined &&
    template.sha256.toLowerCase() !== annotation.form.templateSha256.toLowerCase()
  ) {
    diagnostics.push({
      severity: 'error',
      code: 'TEMPLATE_CHECKSUM_MISMATCH',
      message: 'The loaded PDF checksum does not match form.templateSha256.',
      path: '/form/templateSha256',
    })
  }

  if (template.pages.length !== annotation.form.pages.length) {
    diagnostics.push({
      severity: 'error',
      code: 'TEMPLATE_PAGE_COUNT_MISMATCH',
      message: `The loaded PDF has ${template.pages.length} pages; the annotation declares ${annotation.form.pages.length}.`,
      path: '/form/pages',
    })
  }

  const loadedPagesByNumber = new Map(
    template.pages.map((page) => [page.pageNumber, page]),
  )

  for (const [pageIndex, declaredPage] of annotation.form.pages.entries()) {
    const loadedPage = loadedPagesByNumber.get(declaredPage.pageNumber)

    if (loadedPage === undefined) {
      diagnostics.push({
        severity: 'error',
        code: 'TEMPLATE_PAGE_MISSING',
        message: `The loaded PDF does not contain declared page ${declaredPage.pageNumber}.`,
        page: declaredPage.pageNumber,
        path: `/form/pages/${pageIndex}`,
      })
      continue
    }

    if (!pageDimensionsMatch(declaredPage, loadedPage)) {
      diagnostics.push({
        severity: 'error',
        code: 'TEMPLATE_PAGE_SIZE_MISMATCH',
        message: `Loaded PDF page ${declaredPage.pageNumber} does not match the declared dimensions.`,
        page: declaredPage.pageNumber,
        path: `/form/pages/${pageIndex}`,
      })
    }

    if (!isSupportedPageRotation(loadedPage.rotationDegrees)) {
      diagnostics.push({
        severity: 'error',
        code: 'TEMPLATE_ROTATION_UNSUPPORTED',
        message: `Loaded PDF page ${declaredPage.pageNumber} has unsupported rotation.`,
        page: declaredPage.pageNumber,
        path: `/form/pages/${pageIndex}`,
      })
    }
  }

  return diagnostics
}

function pageDimensionsMatch(
  declaredPage: PageMetadata,
  loadedPage: LoadedTemplatePageMetadata,
): boolean {
  // PDF libraries may report equivalent page boxes with tiny floating-point differences.
  return (
    Number.isFinite(loadedPage.widthPt) &&
    Number.isFinite(loadedPage.heightPt) &&
    Math.abs(declaredPage.widthPt - loadedPage.widthPt) <=
      TEMPLATE_PAGE_SIZE_TOLERANCE_PT &&
    Math.abs(declaredPage.heightPt - loadedPage.heightPt) <=
      TEMPLATE_PAGE_SIZE_TOLERANCE_PT
  )
}

function isSupportedPageRotation(rotationDegrees: number): boolean {
  if (!Number.isFinite(rotationDegrees)) {
    return false
  }

  const normalizedRotation = ((rotationDegrees % 360) + 360) % 360
  return normalizedRotation === 0
}

export function validateDatasetContract(
  expectedContract: DataContract,
  dataset: JsonValue,
): Diagnostic[] {
  if (!isJsonObject(dataset) || !Object.hasOwn(dataset, 'dataContract')) {
    return []
  }

  const suppliedContract = dataset.dataContract

  if (
    !isJsonObject(suppliedContract) ||
    typeof suppliedContract.id !== 'string' ||
    typeof suppliedContract.version !== 'string'
  ) {
    return [
      {
        severity: 'error',
        code: 'DATA_CONTRACT_INVALID',
        message: 'The dataset dataContract must contain string id and version values.',
        path: '/dataContract',
      },
    ]
  }

  const diagnostics: Diagnostic[] = []

  if (suppliedContract.id !== expectedContract.id) {
    diagnostics.push({
      severity: 'error',
      code: 'DATA_CONTRACT_ID_MISMATCH',
      message: 'The dataset contract ID does not match the annotation dataContract.id.',
      path: '/dataContract/id',
    })
  }

  if (suppliedContract.version !== expectedContract.version) {
    diagnostics.push({
      severity: 'error',
      code: 'DATA_CONTRACT_VERSION_MISMATCH',
      message: 'The dataset contract version does not match the annotation dataContract.version.',
      path: '/dataContract/version',
    })
  }

  return diagnostics
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createFieldError(
  field: FieldAnnotation,
  code: string,
  message: string,
  path: string,
): Diagnostic {
  return {
    severity: 'error',
    code,
    message,
    fieldId: field.id,
    page: field.page,
    path,
  }
}
