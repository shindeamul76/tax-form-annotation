import { describe, expect, it } from 'vitest'
import { createDefaultFieldFormat, type FieldFormatType } from './field-format-defaults'

describe('createDefaultFieldFormat', () => {
  it.each<FieldFormatType>([
    'text',
    'number',
    'money',
    'date',
    'checkbox',
    'percentage',
    'masked-identifier',
    'multiline-text',
  ])('creates a complete %s format', (type) => {
    expect(createDefaultFieldFormat(type)).toMatchObject({ type })
  })

  it('uses tax-form-friendly money defaults', () => {
    expect(createDefaultFieldFormat('money')).toEqual({
      type: 'money',
      decimalPlaces: 0,
      useThousandsSeparator: true,
      showCurrencySymbol: false,
      currencySymbol: '$',
      negativeStyle: 'minus',
    })
  })
})
