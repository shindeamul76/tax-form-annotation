import { describe, expect, it } from 'vitest'
import type {
  AnnotationDocument,
  FieldAnnotation,
  JsonValue,
} from './annotation-types'
import {
  TEMPLATE_PAGE_SIZE_TOLERANCE_PT,
  type LoadedTemplateMetadata,
  validateAnnotationSemantics,
} from './validation'

const templateSha256 = 'a'.repeat(64)

function createField(overrides: Partial<FieldAnnotation> = {}): FieldAnnotation {
  return {
    id: 'form1040.line1a.wages',
    label: 'Line 1a wages',
    page: 1,
    source: {
      kind: 'json-pointer',
      pointer: '/returns/federal/2025/income/wages',
    },
    box: {
      x: 0.8,
      y: 0.55,
      width: 0.14,
      height: 0.02,
    },
    format: {
      type: 'money',
      decimalPlaces: 0,
      useThousandsSeparator: true,
      showCurrencySymbol: false,
      currencySymbol: '$',
      negativeStyle: 'minus',
    },
    ...overrides,
  }
}

function createAnnotation(): AnnotationDocument {
  return {
    annotationVersion: '1.0',
    form: {
      formId: 'IRS-1040',
      title: 'U.S. Individual Income Tax Return',
      taxYear: 2025,
      revision: '2025-final',
      templateFile: 'f1040-2025.pdf',
      templateSha256,
      pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
    },
    dataContract: {
      id: 'com.tax-form-annotator.taxpayer-return',
      version: '1.0',
    },
    coordinateSystem: {
      unit: 'normalized',
      origin: 'top-left',
      pageNumbering: 'one-based',
    },
    defaults: {
      style: {
        fontFamily: 'Helvetica',
        fontSizePt: 9,
        minimumFontSizePt: 6,
        horizontalAlign: 'left',
        verticalAlign: 'middle',
        paddingPt: 1,
        color: '#000000',
        overflow: 'shrink',
        rotationDegrees: 0,
        lineHeight: 1.2,
      },
      behavior: {
        onMissing: 'warn',
        onNull: 'blank',
        printZero: false,
      },
    },
    fields: [createField()],
  }
}

function createDataset(): JsonValue {
  return {
    dataContract: {
      id: 'com.tax-form-annotator.taxpayer-return',
      version: '1.0',
    },
    returns: {
      federal: {
        '2025': {
          income: {
            wages: 60_000,
          },
        },
      },
    },
  }
}

function createTemplate(
  overrides: Partial<LoadedTemplateMetadata> = {},
): LoadedTemplateMetadata {
  return {
    fileName: 'f1040-2025.pdf',
    sha256: templateSha256,
    pages: [
      {
        pageNumber: 1,
        widthPt: 612,
        heightPt: 792,
        rotationDegrees: 0,
      },
    ],
    ...overrides,
  }
}

describe('validateAnnotationSemantics', () => {
  it('accepts an annotation matching its template and dataset', () => {
    expect(
      validateAnnotationSemantics(createAnnotation(), {
        dataset: createDataset(),
        template: createTemplate(),
      }),
    ).toEqual({ diagnostics: [], isValid: true })
  })

  it('reports duplicate field IDs', () => {
    const annotation = createAnnotation()
    annotation.fields.push(createField())

    expect(validateAnnotationSemantics(annotation).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_FIELD_ID',
        fieldId: 'form1040.line1a.wages',
        path: '/fields/1/id',
      }),
    )
  })

  it('reports duplicate declared page numbers', () => {
    const annotation = createAnnotation()
    annotation.form.pages.push({ pageNumber: 1, widthPt: 612, heightPt: 792 })

    expect(validateAnnotationSemantics(annotation).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_PAGE_NUMBER',
        path: '/form/pages/1/pageNumber',
      }),
    )
  })

  it('reports a field that references an undeclared page', () => {
    const annotation = createAnnotation()
    annotation.fields[0].page = 2

    expect(validateAnnotationSemantics(annotation).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FIELD_PAGE_NOT_FOUND',
        page: 2,
        path: '/fields/0/page',
      }),
    )
  })

  it.each([
    { x: -0.01, y: 0.1, width: 0.1, height: 0.1 },
    { x: 0.9, y: 0.1, width: 0.2, height: 0.1 },
    { x: 0.1, y: 0.95, width: 0.1, height: 0.1 },
  ])('reports a field box outside the page', (box) => {
    const annotation = createAnnotation()
    annotation.fields[0].box = box

    expect(validateAnnotationSemantics(annotation).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'BOX_OUT_OF_BOUNDS',
        path: '/fields/0/box',
      }),
    )
  })

  it('validates font sizes after applying field overrides', () => {
    const annotation = createAnnotation()
    annotation.fields[0].style = { minimumFontSizePt: 10 }

    expect(validateAnnotationSemantics(annotation).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'MINIMUM_FONT_SIZE_EXCEEDS_FONT_SIZE',
        path: '/fields/0/style/minimumFontSizePt',
      }),
    )
  })

  it('reports filename, checksum, page-count, size, and rotation mismatches', () => {
    const template = createTemplate({
      fileName: 'different.pdf',
      sha256: 'b'.repeat(64),
      pages: [
        {
          pageNumber: 1,
          widthPt: 600,
          heightPt: 800,
          rotationDegrees: 90,
        },
        {
          pageNumber: 2,
          widthPt: 612,
          heightPt: 792,
          rotationDegrees: 0,
        },
      ],
    })

    const codes = validateAnnotationSemantics(createAnnotation(), {
      template,
    }).diagnostics.map(({ code }) => code)

    expect(codes).toEqual([
      'TEMPLATE_FILENAME_MISMATCH',
      'TEMPLATE_CHECKSUM_MISMATCH',
      'TEMPLATE_PAGE_COUNT_MISMATCH',
      'TEMPLATE_PAGE_SIZE_MISMATCH',
      'TEMPLATE_ROTATION_UNSUPPORTED',
    ])
  })

  it('reports a declared page that is absent from the loaded template', () => {
    const template = createTemplate({
      pages: [
        {
          pageNumber: 2,
          widthPt: 612,
          heightPt: 792,
          rotationDegrees: 0,
        },
      ],
    })

    expect(
      validateAnnotationSemantics(createAnnotation(), { template }).diagnostics,
    ).toContainEqual(
      expect.objectContaining({
        code: 'TEMPLATE_PAGE_MISSING',
        page: 1,
      }),
    )
  })

  it('accepts equivalent page dimensions within the point tolerance', () => {
    const template = createTemplate({
      pages: [
        {
          pageNumber: 1,
          widthPt: 612 + TEMPLATE_PAGE_SIZE_TOLERANCE_PT,
          heightPt: 792 - TEMPLATE_PAGE_SIZE_TOLERANCE_PT,
          rotationDegrees: 360,
        },
      ],
    })

    expect(
      validateAnnotationSemantics(createAnnotation(), { template }),
    ).toEqual({ diagnostics: [], isValid: true })
  })

  it('compares hexadecimal template checksums case-insensitively', () => {
    const annotation = createAnnotation()
    annotation.form.templateSha256 = templateSha256.toUpperCase()

    expect(
      validateAnnotationSemantics(annotation, {
        template: createTemplate(),
      }),
    ).toEqual({ diagnostics: [], isValid: true })
  })

  it('reports dataset contract ID and version mismatches', () => {
    const dataset = createDataset()

    if (typeof dataset === 'object' && dataset !== null && !Array.isArray(dataset)) {
      dataset.dataContract = {
        id: 'com.example.other-contract',
        version: '2.0',
      }
    }

    const codes = validateAnnotationSemantics(createAnnotation(), {
      dataset,
    }).diagnostics.map(({ code }) => code)

    expect(codes).toEqual([
      'DATA_CONTRACT_ID_MISMATCH',
      'DATA_CONTRACT_VERSION_MISMATCH',
    ])
  })

  it('reports malformed dataset contract metadata', () => {
    const dataset: JsonValue = {
      dataContract: 'invalid',
      returns: {
        federal: {
          '2025': {
            income: { wages: 60_000 },
          },
        },
      },
    }

    expect(
      validateAnnotationSemantics(createAnnotation(), { dataset }).diagnostics,
    ).toContainEqual(
      expect.objectContaining({
        code: 'DATA_CONTRACT_INVALID',
        path: '/dataContract',
      }),
    )
  })

  it('includes nonfatal render warnings without invalidating the annotation', () => {
    const annotation = createAnnotation()
    annotation.fields[0].source = {
      kind: 'json-pointer',
      pointer: '/returns/federal/2025/income/missing',
    }

    const result = validateAnnotationSemantics(annotation, {
      dataset: createDataset(),
    })

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'FIELD_POINTER_MISSING',
      }),
    )
    expect(result.isValid).toBe(true)
  })

  it('marks render errors as invalid', () => {
    const annotation = createAnnotation()
    annotation.fields[0].format = {
      type: 'text',
      trim: true,
      case: 'preserve',
    }

    const result = validateAnnotationSemantics(annotation, {
      dataset: createDataset(),
    })

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'FIELD_VALUE_TYPE_MISMATCH',
      }),
    )
    expect(result.isValid).toBe(false)
  })
})
