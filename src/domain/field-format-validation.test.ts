import { describe, expect, it } from 'vitest'
import { createDefaultFieldFormat } from './field-format-defaults'
import { isValidFieldFormat } from './field-format-validation'

describe('isValidFieldFormat', () => {
  it('accepts complete default formats', () => {
    expect(isValidFieldFormat(createDefaultFieldFormat('money'))).toBe(true)
    expect(isValidFieldFormat(createDefaultFieldFormat('checkbox'))).toBe(true)
    expect(isValidFieldFormat(createDefaultFieldFormat('masked-identifier'))).toBe(
      true,
    )
  })

  it('rejects invalid format constraints', () => {
    expect(
      isValidFieldFormat({
        type: 'money',
        decimalPlaces: -1,
        useThousandsSeparator: true,
        showCurrencySymbol: true,
        currencySymbol: '',
        negativeStyle: 'minus',
      }),
    ).toBe(false)
    expect(
      isValidFieldFormat({
        type: 'masked-identifier',
        mask: '000-00',
        placeholder: '#',
      }),
    ).toBe(false)
  })
})
