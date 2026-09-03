import type {
  CheckboxFormat,
  DateFormat,
  FieldFormat,
  JsonValue,
  MaskedIdentifierFormat,
  MoneyFormat,
  MultilineTextFormat,
  NegativeNumberStyle,
  NumberFormat,
  PercentageFormat,
  TextCase,
  TextFormat,
} from './annotation-types'
import type { Diagnostic } from './diagnostics'

export type FieldFormatResult = FormattedFieldValue | FieldFormatFailure

export interface FormattedFieldValue {
  status: 'formatted'
  text: string
}

export interface FieldFormatFailure {
  status: 'error'
  diagnostic: FieldFormatDiagnostic
}

export interface FieldFormatDiagnostic extends Diagnostic {
  severity: 'error'
  code: FieldFormatErrorCode
}

export type FieldFormatErrorCode =
  | 'FIELD_VALUE_TYPE_MISMATCH'
  | 'FIELD_VALUE_INVALID'
  | 'FIELD_FORMAT_INVALID'

interface NumericFormatOptions {
  formatType: 'number' | 'money' | 'percentage'
  decimalPlaces: number
  useThousandsSeparator: boolean
  negativeStyle: NegativeNumberStyle
  multiplier: number
  prefix: string
  suffix: string
}

const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/u
const newlinePattern = /\r\n?|\n/gu
const titleCaseBoundaryPattern = /(^|[\s'-])\p{L}/gu

export function formatFieldValue(
  value: JsonValue,
  format: FieldFormat,
): FieldFormatResult {
  switch (format.type) {
    case 'text':
      return formatText(value, format)
    case 'number':
      return formatNumber(value, format)
    case 'money':
      return formatMoney(value, format)
    case 'date':
      return formatDate(value, format)
    case 'checkbox':
      return formatCheckbox(value, format)
    case 'percentage':
      return formatPercentage(value, format)
    case 'masked-identifier':
      return formatMaskedIdentifier(value, format)
    case 'multiline-text':
      return formatMultilineText(value, format)
  }

  return assertNever(format)
}

function formatText(value: JsonValue, format: TextFormat): FieldFormatResult {
  if (typeof value !== 'string') {
    return createTypeMismatch(format.type, 'string')
  }

  const normalizedValue = format.trim ? value.trim() : value
  const casedValue = applyTextCase(normalizedValue, format.case)

  return createFormattedValue(
    `${format.prefix ?? ''}${casedValue}${format.suffix ?? ''}`,
  )
}

function applyTextCase(value: string, textCase: TextCase): string {
  switch (textCase) {
    case 'preserve':
      return value
    case 'uppercase':
      return value.toLocaleUpperCase('en-US')
    case 'lowercase':
      return value.toLocaleLowerCase('en-US')
    case 'title-case':
      return value
        .toLocaleLowerCase('en-US')
        .replace(titleCaseBoundaryPattern, (character) =>
          character.toLocaleUpperCase('en-US'),
        )
  }

  return assertNever(textCase)
}

function formatNumber(value: JsonValue, format: NumberFormat): FieldFormatResult {
  return formatNumericValue(value, {
    formatType: format.type,
    decimalPlaces: format.decimalPlaces,
    useThousandsSeparator: format.useThousandsSeparator,
    negativeStyle: format.negativeStyle,
    multiplier: 1,
    prefix: '',
    suffix: '',
  })
}

function formatMoney(value: JsonValue, format: MoneyFormat): FieldFormatResult {
  return formatNumericValue(value, {
    formatType: format.type,
    decimalPlaces: format.decimalPlaces,
    useThousandsSeparator: format.useThousandsSeparator,
    negativeStyle: format.negativeStyle,
    multiplier: 1,
    prefix: format.showCurrencySymbol ? format.currencySymbol : '',
    suffix: '',
  })
}

function formatPercentage(
  value: JsonValue,
  format: PercentageFormat,
): FieldFormatResult {
  return formatNumericValue(value, {
    formatType: format.type,
    decimalPlaces: format.decimalPlaces,
    useThousandsSeparator: false,
    negativeStyle: 'minus',
    multiplier: format.inputScale === 'fraction' ? 100 : 1,
    prefix: '',
    suffix: format.showPercentSymbol ? '%' : '',
  })
}

function formatNumericValue(
  value: JsonValue,
  options: NumericFormatOptions,
): FieldFormatResult {
  if (typeof value !== 'number') {
    return createTypeMismatch(options.formatType, 'number')
  }

  const scaledValue = value * options.multiplier

  if (!Number.isFinite(scaledValue)) {
    return createFailure(
      'FIELD_VALUE_INVALID',
      `The ${options.formatType} value must be a finite number.`,
    )
  }

  if (!Number.isInteger(options.decimalPlaces) || options.decimalPlaces < 0) {
    return createFailure(
      'FIELD_FORMAT_INVALID',
      `The ${options.formatType} decimalPlaces option must be a non-negative integer.`,
    )
  }

  let magnitudeText: string

  try {
    const numberFormatter = new Intl.NumberFormat('en-US', {
      useGrouping: options.useThousandsSeparator,
      minimumFractionDigits: options.decimalPlaces,
      maximumFractionDigits: options.decimalPlaces,
    })
    magnitudeText = numberFormatter.format(Math.abs(scaledValue))
  } catch {
    return createFailure(
      'FIELD_FORMAT_INVALID',
      `The ${options.formatType} decimalPlaces option is not supported.`,
    )
  }

  const unsignedText = `${options.prefix}${magnitudeText}${options.suffix}`

  if (scaledValue >= 0 || Object.is(scaledValue, -0)) {
    return createFormattedValue(unsignedText)
  }

  return createFormattedValue(
    options.negativeStyle === 'parentheses'
      ? `(${unsignedText})`
      : `-${unsignedText}`,
  )
}

function formatDate(value: JsonValue, format: DateFormat): FieldFormatResult {
  if (typeof value !== 'string') {
    return createTypeMismatch(format.type, 'YYYY-MM-DD string')
  }

  const dateParts = calendarDatePattern.exec(value)

  if (dateParts === null) {
    return createInvalidDateFailure()
  }

  const [, yearText, monthText, dayText] = dateParts
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!isValidCalendarDate(year, month, day)) {
    return createInvalidDateFailure()
  }

  switch (format.outputPattern) {
    case 'MM/DD/YYYY':
      return createFormattedValue(`${monthText}/${dayText}/${yearText}`)
    case 'MM-DD-YYYY':
      return createFormattedValue(`${monthText}-${dayText}-${yearText}`)
    case 'YYYY-MM-DD':
      return createFormattedValue(value)
    case 'MMDDYYYY':
      return createFormattedValue(`${monthText}${dayText}${yearText}`)
  }

  return assertNever(format.outputPattern)
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return day <= daysInMonth[month - 1]
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function createInvalidDateFailure(): FieldFormatFailure {
  return createFailure(
    'FIELD_VALUE_INVALID',
    'The date value must be a valid calendar date in YYYY-MM-DD format.',
  )
}

function formatCheckbox(
  value: JsonValue,
  format: CheckboxFormat,
): FieldFormatResult {
  if (typeof value !== 'boolean') {
    return createTypeMismatch(format.type, 'boolean')
  }

  return createFormattedValue(value ? format.trueMark : format.falseMark)
}

function formatMaskedIdentifier(
  value: JsonValue,
  format: MaskedIdentifierFormat,
): FieldFormatResult {
  if (typeof value !== 'string') {
    return createTypeMismatch(format.type, 'string')
  }

  const placeholderCharacters = [...format.placeholder]

  if (placeholderCharacters.length !== 1) {
    return createFailure(
      'FIELD_FORMAT_INVALID',
      'The masked-identifier placeholder must contain exactly one character.',
    )
  }

  const [placeholder] = placeholderCharacters
  const maskCharacters = [...format.mask]
  const valueCharacters = [...value]
  const placeholderCount = maskCharacters.filter(
    (character) => character === placeholder,
  ).length

  if (placeholderCount === 0) {
    return createFailure(
      'FIELD_FORMAT_INVALID',
      'The masked-identifier mask must contain at least one placeholder.',
    )
  }

  if (valueCharacters.length !== placeholderCount) {
    return createFailure(
      'FIELD_VALUE_INVALID',
      `The masked-identifier value must contain exactly ${placeholderCount} characters.`,
    )
  }

  let valueIndex = 0
  const text = maskCharacters
    .map((character) => {
      if (character !== placeholder) {
        return character
      }

      const valueCharacter = valueCharacters[valueIndex]
      valueIndex += 1
      return valueCharacter
    })
    .join('')

  return createFormattedValue(text)
}

function formatMultilineText(
  value: JsonValue,
  format: MultilineTextFormat,
): FieldFormatResult {
  if (typeof value !== 'string') {
    return createTypeMismatch(format.type, 'string')
  }

  const normalizedNewlines = value.replace(newlinePattern, '\n')
  const text = format.preserveNewlines
    ? normalizedNewlines
    : normalizedNewlines.replaceAll('\n', ' ')

  return createFormattedValue(text)
}

function createFormattedValue(text: string): FormattedFieldValue {
  return { status: 'formatted', text }
}

function createTypeMismatch(
  formatType: FieldFormat['type'],
  expectedType: string,
): FieldFormatFailure {
  return createFailure(
    'FIELD_VALUE_TYPE_MISMATCH',
    `The ${formatType} format requires a ${expectedType} value.`,
  )
}

function createFailure(
  code: FieldFormatErrorCode,
  message: string,
): FieldFormatFailure {
  return {
    status: 'error',
    diagnostic: {
      severity: 'error',
      code,
      message,
    },
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported field format option: ${String(value)}`)
}
