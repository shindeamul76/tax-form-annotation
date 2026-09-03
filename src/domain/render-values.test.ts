import { describe, expect, it } from 'vitest'
import type {
  AnnotationDefaults,
  AnnotationDocument,
  FieldAnnotation,
  FieldBehavior,
  FieldStyle,
  JsonValue,
  MissingValueBehavior,
} from './annotation-types'
import {
  resolveFieldBehavior,
  resolveFieldStyle,
  resolveRenderValue,
  resolveRenderValues,
} from './render-values'

const defaultStyle: FieldStyle = {
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
}

const defaultBehavior: FieldBehavior = {
  onMissing: 'warn',
  onNull: 'blank',
  printZero: false,
}

const defaults: AnnotationDefaults = {
  style: defaultStyle,
  behavior: defaultBehavior,
}

const dataset: JsonValue = {
  taxpayer: {
    firstName: 'Taylor',
    middleName: null,
  },
  income: {
    wages: 60_000,
    interest: 0,
  },
  filingStatus: {
    single: false,
  },
  emptyText: '',
}

function createField(overrides: Partial<FieldAnnotation> = {}): FieldAnnotation {
  return {
    id: 'form1040.taxpayer.firstName',
    label: 'Taxpayer first name',
    page: 1,
    source: {
      kind: 'json-pointer',
      pointer: '/taxpayer/firstName',
    },
    box: {
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.02,
    },
    format: {
      type: 'text',
      trim: true,
      case: 'preserve',
    },
    ...overrides,
  }
}

function createAnnotation(fields: FieldAnnotation[]): AnnotationDocument {
  return {
    annotationVersion: '1.0',
    form: {
      formId: 'IRS-1040',
      title: 'U.S. Individual Income Tax Return',
      taxYear: 2025,
      revision: '2025-final',
      templateFile: 'f1040-2025.pdf',
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
    defaults,
    fields,
  }
}

describe('resolveRenderValue', () => {
  it('resolves and formats a JSON Pointer source', () => {
    expect(
      resolveRenderValue({ field: createField(), defaults, dataset }),
    ).toEqual({
      status: 'ready',
      value: {
        fieldId: 'form1040.taxpayer.firstName',
        page: 1,
        text: 'Taylor',
        box: {
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.02,
        },
        style: defaultStyle,
      },
    })
  })

  it('resolves a constant without reading the dataset', () => {
    const field = createField({
      source: { kind: 'constant', value: 'Taxpayer copy' },
    })

    expect(resolveRenderValue({ field, defaults, dataset: null })).toMatchObject({
      status: 'ready',
      value: { text: 'Taxpayer copy' },
    })
  })

  it('merges a field style override with the document defaults', () => {
    const field = createField({
      style: {
        horizontalAlign: 'right',
        fontSizePt: 10,
      },
    })
    const result = resolveRenderValue({ field, defaults, dataset })

    expect(result).toMatchObject({
      status: 'ready',
      value: {
        style: {
          ...defaultStyle,
          horizontalAlign: 'right',
          fontSizePt: 10,
        },
      },
    })
    expect(defaults.style).toEqual(defaultStyle)
  })

  it.each([
    ['blank', 'skipped', undefined],
    ['warn', 'skipped', 'warning'],
    ['error', 'error', 'error'],
  ] as const)(
    'applies the %s behavior to a missing pointer',
    (onMissing, expectedStatus, expectedSeverity) => {
      const field = createField({
        source: { kind: 'json-pointer', pointer: '/taxpayer/lastName' },
        behavior: { onMissing },
      })
      const result = resolveRenderValue({ field, defaults, dataset })

      expect(result.status).toBe(expectedStatus)

      if (result.status !== 'ready') {
        if (expectedSeverity === undefined) {
          expect(result.diagnostics).toEqual([])
        } else {
          expect(result.diagnostics).toEqual([
            {
              severity: expectedSeverity,
              code: 'FIELD_POINTER_MISSING',
              message: 'The source path does not exist in the dataset.',
              fieldId: field.id,
              page: field.page,
              path: '/taxpayer/lastName',
            },
          ])
        }
      }
    },
  )

  it('treats an invalid JSON Pointer as an error regardless of missing behavior', () => {
    const field = createField({
      source: { kind: 'json-pointer', pointer: 'taxpayer/firstName' },
      behavior: { onMissing: 'blank' },
    })

    expect(resolveRenderValue({ field, defaults, dataset })).toEqual({
      status: 'error',
      diagnostics: [
        {
          severity: 'error',
          code: 'FIELD_POINTER_INVALID',
          message: 'The source path is not a valid JSON Pointer.',
          fieldId: field.id,
          page: field.page,
          path: 'taxpayer/firstName',
        },
      ],
    })
  })

  it.each([
    ['blank', 'skipped', undefined],
    ['warn', 'skipped', 'warning'],
    ['error', 'error', 'error'],
  ] as const)(
    'applies the %s behavior to a null value',
    (onNull, expectedStatus, expectedSeverity) => {
      const field = createField({
        source: { kind: 'json-pointer', pointer: '/taxpayer/middleName' },
        behavior: { onNull },
      })
      const result = resolveRenderValue({ field, defaults, dataset })

      expect(result.status).toBe(expectedStatus)

      if (result.status !== 'ready') {
        if (expectedSeverity === undefined) {
          expect(result.diagnostics).toEqual([])
        } else {
          expect(result.diagnostics).toEqual([
            expect.objectContaining({
              severity: expectedSeverity,
              code: 'FIELD_VALUE_NULL',
              fieldId: field.id,
              path: '/taxpayer/middleName',
            }),
          ])
        }
      }
    },
  )

  it('skips numeric zero when printZero is false', () => {
    const field = createField({
      source: { kind: 'json-pointer', pointer: '/income/interest' },
      format: {
        type: 'money',
        decimalPlaces: 0,
        useThousandsSeparator: true,
        showCurrencySymbol: false,
        currencySymbol: '$',
        negativeStyle: 'minus',
      },
    })

    expect(resolveRenderValue({ field, defaults, dataset })).toEqual({
      status: 'skipped',
      diagnostics: [],
    })
  })

  it('formats numeric zero when printZero is true', () => {
    const field = createField({
      source: { kind: 'json-pointer', pointer: '/income/interest' },
      behavior: { printZero: true },
      format: {
        type: 'money',
        decimalPlaces: 0,
        useThousandsSeparator: true,
        showCurrencySymbol: false,
        currencySymbol: '$',
        negativeStyle: 'minus',
      },
    })

    expect(resolveRenderValue({ field, defaults, dataset })).toMatchObject({
      status: 'ready',
      value: { text: '0' },
    })
  })

  it('formats boolean false independently of printZero', () => {
    const field = createField({
      source: { kind: 'json-pointer', pointer: '/filingStatus/single' },
      format: { type: 'checkbox', trueMark: 'X', falseMark: '' },
    })

    expect(resolveRenderValue({ field, defaults, dataset })).toMatchObject({
      status: 'ready',
      value: { text: '' },
    })
  })

  it('formats an empty string instead of treating it as missing', () => {
    const field = createField({
      source: { kind: 'json-pointer', pointer: '/emptyText' },
    })

    expect(resolveRenderValue({ field, defaults, dataset })).toMatchObject({
      status: 'ready',
      value: { text: '' },
    })
  })

  it('adds field context to a formatting diagnostic', () => {
    const field = createField({
      source: { kind: 'json-pointer', pointer: '/income/wages' },
    })

    expect(resolveRenderValue({ field, defaults, dataset })).toEqual({
      status: 'error',
      diagnostics: [
        {
          severity: 'error',
          code: 'FIELD_VALUE_TYPE_MISMATCH',
          message: 'The text format requires a string value.',
          fieldId: field.id,
          page: field.page,
          path: '/income/wages',
        },
      ],
    })
  })
})

describe('resolveRenderValues', () => {
  it('preserves field order and collects diagnostics', () => {
    const firstField = createField({
      id: 'first',
      source: { kind: 'constant', value: 'First' },
    })
    const missingField = createField({
      id: 'missing',
      source: { kind: 'json-pointer', pointer: '/missing' },
    })
    const secondField = createField({
      id: 'second',
      source: { kind: 'constant', value: 'Second' },
    })
    const invalidField = createField({
      id: 'invalid',
      source: { kind: 'constant', value: 42 },
    })

    const result = resolveRenderValues(
      createAnnotation([firstField, missingField, secondField, invalidField]),
      dataset,
    )

    expect(result.values.map(({ fieldId }) => fieldId)).toEqual([
      'first',
      'second',
    ])
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'FIELD_POINTER_MISSING',
      'FIELD_VALUE_TYPE_MISMATCH',
    ])
    expect(result.hasErrors).toBe(true)
  })

  it('does not report warnings as fatal errors', () => {
    const missingField = createField({
      source: { kind: 'json-pointer', pointer: '/missing' },
      behavior: { onMissing: 'warn' },
    })

    const result = resolveRenderValues(createAnnotation([missingField]), dataset)

    expect(result.values).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.hasErrors).toBe(false)
  })
})

describe('default inheritance', () => {
  it('returns complete style and behavior objects without mutation', () => {
    expect(resolveFieldStyle(defaultStyle, { color: '#FF0000' })).toEqual({
      ...defaultStyle,
      color: '#FF0000',
    })
    expect(
      resolveFieldBehavior(defaultBehavior, { onMissing: 'error' }),
    ).toEqual({
      ...defaultBehavior,
      onMissing: 'error',
    })
    expect(defaultStyle.color).toBe('#000000')
    expect(defaultBehavior.onMissing).toBe('warn')
  })

  it.each<MissingValueBehavior>(['blank', 'warn', 'error'])(
    'accepts the %s behavior override',
    (onMissing) => {
      expect(resolveFieldBehavior(defaultBehavior, { onMissing })).toMatchObject({
        onMissing,
      })
    },
  )
})
