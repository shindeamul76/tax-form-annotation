import type { FieldFormat } from './annotation-types'

export type FieldFormatType = FieldFormat['type']

export function createDefaultFieldFormat(type: FieldFormatType): FieldFormat {
  switch (type) {
    case 'text':
      return { type, trim: true, case: 'preserve' }
    case 'number':
      return {
        type,
        decimalPlaces: 0,
        useThousandsSeparator: true,
        negativeStyle: 'minus',
      }
    case 'money':
      return {
        type,
        decimalPlaces: 0,
        useThousandsSeparator: true,
        showCurrencySymbol: false,
        currencySymbol: '$',
        negativeStyle: 'minus',
      }
    case 'date':
      return {
        type,
        inputPattern: 'YYYY-MM-DD',
        outputPattern: 'MM/DD/YYYY',
      }
    case 'checkbox':
      return { type, trueMark: 'X', falseMark: '' }
    case 'percentage':
      return {
        type,
        inputScale: 'fraction',
        decimalPlaces: 2,
        showPercentSymbol: true,
      }
    case 'masked-identifier':
      return { type, mask: '###-##-####', placeholder: '#' }
    case 'multiline-text':
      return { type, preserveNewlines: true, maximumLines: 3 }
  }
}
