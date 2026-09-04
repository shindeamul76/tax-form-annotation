import type { FieldFormat } from './annotation-types'

export function isValidFieldFormat(format: FieldFormat): boolean {
  switch (format.type) {
    case 'text':
    case 'date':
      return true
    case 'number':
      return isNonNegativeInteger(format.decimalPlaces)
    case 'money':
      return (
        isNonNegativeInteger(format.decimalPlaces) &&
        format.currencySymbol.length > 0
      )
    case 'checkbox':
      return format.trueMark.length > 0
    case 'percentage':
      return isNonNegativeInteger(format.decimalPlaces)
    case 'masked-identifier':
      return (
        format.mask.length > 0 &&
        [...format.placeholder].length === 1 &&
        format.mask.includes(format.placeholder)
      )
    case 'multiline-text':
      return Number.isInteger(format.maximumLines) && format.maximumLines > 0
  }
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}
