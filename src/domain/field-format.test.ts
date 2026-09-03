import { describe, expect, it } from 'vitest'
import type { FieldFormat, JsonValue } from './annotation-types'
import { formatFieldValue } from './field-format'

describe('formatFieldValue', () => {
  describe('text', () => {
    it('trims, title-cases, and decorates text in a deterministic locale', () => {
      expect(
        formatFieldValue("  mARY-jANE o'CONNOR  ", {
          type: 'text',
          trim: true,
          case: 'title-case',
          prefix: 'Dr. ',
          suffix: ', CPA',
        }),
      ).toEqual({
        status: 'formatted',
        text: "Dr. Mary-Jane O'Connor, CPA",
      })
    })

    it.each([
      ['preserve', 'MiXeD', 'MiXeD'],
      ['uppercase', 'MiXeD', 'MIXED'],
      ['lowercase', 'MiXeD', 'mixed'],
    ] as const)('applies the %s case option', (textCase, value, expectedText) => {
      expect(
        formatFieldValue(value, {
          type: 'text',
          trim: false,
          case: textCase,
        }),
      ).toEqual({ status: 'formatted', text: expectedText })
    })
  })

  describe('number', () => {
    it('applies decimal places, grouping, and parentheses', () => {
      expect(
        formatFieldValue(-12_345.5, {
          type: 'number',
          decimalPlaces: 2,
          useThousandsSeparator: true,
          negativeStyle: 'parentheses',
        }),
      ).toEqual({ status: 'formatted', text: '(12,345.50)' })
    })

    it('does not group thousands when grouping is disabled', () => {
      expect(
        formatFieldValue(12_345.6, {
          type: 'number',
          decimalPlaces: 0,
          useThousandsSeparator: false,
          negativeStyle: 'minus',
        }),
      ).toEqual({ status: 'formatted', text: '12346' })
    })

    it('renders negative zero without a negative mark', () => {
      expect(
        formatFieldValue(-0, {
          type: 'number',
          decimalPlaces: 0,
          useThousandsSeparator: true,
          negativeStyle: 'minus',
        }),
      ).toEqual({ status: 'formatted', text: '0' })
    })
  })

  describe('money', () => {
    it('places the currency symbol inside negative parentheses', () => {
      expect(
        formatFieldValue(-1_234.5, {
          type: 'money',
          decimalPlaces: 2,
          useThousandsSeparator: true,
          showCurrencySymbol: true,
          currencySymbol: '$',
          negativeStyle: 'parentheses',
        }),
      ).toEqual({ status: 'formatted', text: '($1,234.50)' })
    })

    it('omits the currency symbol for a tax-form amount', () => {
      expect(
        formatFieldValue(60_000, {
          type: 'money',
          decimalPlaces: 0,
          useThousandsSeparator: true,
          showCurrencySymbol: false,
          currencySymbol: '$',
          negativeStyle: 'minus',
        }),
      ).toEqual({ status: 'formatted', text: '60,000' })
    })
  })

  describe('date', () => {
    it.each([
      ['MM/DD/YYYY', '02/29/2024'],
      ['MM-DD-YYYY', '02-29-2024'],
      ['YYYY-MM-DD', '2024-02-29'],
      ['MMDDYYYY', '02292024'],
    ] as const)('produces the %s output pattern', (outputPattern, expectedText) => {
      expect(
        formatFieldValue('2024-02-29', {
          type: 'date',
          inputPattern: 'YYYY-MM-DD',
          outputPattern,
        }),
      ).toEqual({ status: 'formatted', text: expectedText })
    })

    it.each(['02/28/2025', '2025-02-29', '2025-13-01', '2025-04-31'])(
      'rejects the invalid calendar date %s',
      (value) => {
        expect(
          formatFieldValue(value, {
            type: 'date',
            inputPattern: 'YYYY-MM-DD',
            outputPattern: 'MM/DD/YYYY',
          }),
        ).toMatchObject({
          status: 'error',
          diagnostic: { code: 'FIELD_VALUE_INVALID' },
        })
      },
    )
  })

  describe('checkbox', () => {
    const checkboxFormat = {
      type: 'checkbox',
      trueMark: 'X',
      falseMark: '',
    } as const

    it('renders the configured true mark', () => {
      expect(formatFieldValue(true, checkboxFormat)).toEqual({
        status: 'formatted',
        text: 'X',
      })
    })

    it('renders the configured false mark', () => {
      expect(formatFieldValue(false, checkboxFormat)).toEqual({
        status: 'formatted',
        text: '',
      })
    })
  })

  describe('percentage', () => {
    it('scales a fraction and appends the percent symbol', () => {
      expect(
        formatFieldValue(0.125, {
          type: 'percentage',
          inputScale: 'fraction',
          decimalPlaces: 1,
          showPercentSymbol: true,
        }),
      ).toEqual({ status: 'formatted', text: '12.5%' })
    })

    it('preserves an already-scaled percentage', () => {
      expect(
        formatFieldValue(12.5, {
          type: 'percentage',
          inputScale: 'percent',
          decimalPlaces: 1,
          showPercentSymbol: false,
        }),
      ).toEqual({ status: 'formatted', text: '12.5' })
    })
  })

  describe('masked identifier', () => {
    const identifierFormat = {
      type: 'masked-identifier',
      mask: '###-##-####',
      placeholder: '#',
    } as const

    it('inserts identifier characters into the mask', () => {
      expect(formatFieldValue('123456789', identifierFormat)).toEqual({
        status: 'formatted',
        text: '123-45-6789',
      })
    })

    it('rejects a value whose character count does not match the mask', () => {
      expect(formatFieldValue('1234', identifierFormat)).toMatchObject({
        status: 'error',
        diagnostic: { code: 'FIELD_VALUE_INVALID' },
      })
    })

    it('rejects a mask without a placeholder', () => {
      expect(
        formatFieldValue('123', {
          type: 'masked-identifier',
          mask: '---',
          placeholder: '#',
        }),
      ).toMatchObject({
        status: 'error',
        diagnostic: { code: 'FIELD_FORMAT_INVALID' },
      })
    })
  })

  describe('multiline text', () => {
    it('normalizes and preserves source newlines when configured', () => {
      expect(
        formatFieldValue('First line\r\nSecond line', {
          type: 'multiline-text',
          preserveNewlines: true,
          maximumLines: 2,
        }),
      ).toEqual({ status: 'formatted', text: 'First line\nSecond line' })
    })

    it('replaces source newlines with spaces when preservation is disabled', () => {
      expect(
        formatFieldValue('First line\nSecond line', {
          type: 'multiline-text',
          preserveNewlines: false,
          maximumLines: 2,
        }),
      ).toEqual({ status: 'formatted', text: 'First line Second line' })
    })
  })

  it.each([
    [42, { type: 'text', trim: true, case: 'preserve' }],
    ['42', { type: 'number', decimalPlaces: 0, useThousandsSeparator: true, negativeStyle: 'minus' }],
    ['true', { type: 'checkbox', trueMark: 'X', falseMark: '' }],
  ] satisfies [JsonValue, FieldFormat][])('rejects a value with the wrong JSON type', (value, format) => {
    expect(formatFieldValue(value, format)).toMatchObject({
      status: 'error',
      diagnostic: { code: 'FIELD_VALUE_TYPE_MISMATCH' },
    })
  })

  it('rejects a non-finite numeric value', () => {
    expect(
      formatFieldValue(Number.POSITIVE_INFINITY, {
        type: 'number',
        decimalPlaces: 0,
        useThousandsSeparator: true,
        negativeStyle: 'minus',
      }),
    ).toMatchObject({
      status: 'error',
      diagnostic: { code: 'FIELD_VALUE_INVALID' },
    })
  })

  it('rejects invalid numeric format options', () => {
    expect(
      formatFieldValue(42, {
        type: 'number',
        decimalPlaces: -1,
        useThousandsSeparator: true,
        negativeStyle: 'minus',
      }),
    ).toMatchObject({
      status: 'error',
      diagnostic: { code: 'FIELD_FORMAT_INVALID' },
    })
  })
})
