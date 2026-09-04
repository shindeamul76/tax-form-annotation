import type { ChangeEvent } from 'react'
import type { FieldFormat } from '../../domain/annotation-types'

interface FieldFormatEditorProps {
  format: FieldFormat
  onChange: (format: FieldFormat) => void
}

export function FieldFormatEditor({
  format,
  onChange,
}: FieldFormatEditorProps) {
  switch (format.type) {
    case 'text':
      return (
        <div className="inspector-grid">
          <CheckboxControl
            label="Trim whitespace"
            checked={format.trim}
            onChange={(trim) => onChange({ ...format, trim })}
          />
          <label>
            Letter case
            <select
              value={format.case}
              onChange={(event) =>
                onChange({
                  ...format,
                  case: event.currentTarget.value as typeof format.case,
                })
              }
            >
              <option value="preserve">Preserve</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="title-case">Title case</option>
            </select>
          </label>
          <label>
            Prefix
            <input
              value={format.prefix ?? ''}
              onChange={(event) =>
                onChange({ ...format, prefix: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Suffix
            <input
              value={format.suffix ?? ''}
              onChange={(event) =>
                onChange({ ...format, suffix: event.currentTarget.value })
              }
            />
          </label>
        </div>
      )
    case 'number':
      return (
        <div className="inspector-grid">
          <IntegerControl
            label="Decimal places"
            value={format.decimalPlaces}
            minimum={0}
            onChange={(decimalPlaces) =>
              onChange({ ...format, decimalPlaces })
            }
          />
          <CheckboxControl
            label="Thousands separator"
            checked={format.useThousandsSeparator}
            onChange={(useThousandsSeparator) =>
              onChange({ ...format, useThousandsSeparator })
            }
          />
          <NegativeStyleControl format={format} onChange={onChange} />
        </div>
      )
    case 'money':
      return (
        <div className="inspector-grid">
          <IntegerControl
            label="Decimal places"
            value={format.decimalPlaces}
            minimum={0}
            onChange={(decimalPlaces) =>
              onChange({ ...format, decimalPlaces })
            }
          />
          <CheckboxControl
            label="Thousands separator"
            checked={format.useThousandsSeparator}
            onChange={(useThousandsSeparator) =>
              onChange({ ...format, useThousandsSeparator })
            }
          />
          <CheckboxControl
            label="Show currency symbol"
            checked={format.showCurrencySymbol}
            onChange={(showCurrencySymbol) =>
              onChange({ ...format, showCurrencySymbol })
            }
          />
          <label>
            Currency symbol
            <input
              required
              value={format.currencySymbol}
              onChange={(event) =>
                onChange({
                  ...format,
                  currencySymbol: event.currentTarget.value,
                })
              }
            />
          </label>
          <NegativeStyleControl format={format} onChange={onChange} />
        </div>
      )
    case 'date':
      return (
        <div className="inspector-grid">
          <label>
            Input pattern
            <input value={format.inputPattern} disabled />
          </label>
          <label>
            Output pattern
            <select
              value={format.outputPattern}
              onChange={(event) =>
                onChange({
                  ...format,
                  outputPattern: event.currentTarget
                    .value as typeof format.outputPattern,
                })
              }
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="MM-DD-YYYY">MM-DD-YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MMDDYYYY">MMDDYYYY</option>
            </select>
          </label>
        </div>
      )
    case 'checkbox':
      return (
        <div className="inspector-grid">
          <label>
            True mark
            <input
              required
              value={format.trueMark}
              onChange={(event) =>
                onChange({ ...format, trueMark: event.currentTarget.value })
              }
            />
          </label>
          <label>
            False mark
            <input
              value={format.falseMark}
              onChange={(event) =>
                onChange({ ...format, falseMark: event.currentTarget.value })
              }
            />
          </label>
        </div>
      )
    case 'percentage':
      return (
        <div className="inspector-grid">
          <label>
            Input scale
            <select
              value={format.inputScale}
              onChange={(event) =>
                onChange({
                  ...format,
                  inputScale: event.currentTarget
                    .value as typeof format.inputScale,
                })
              }
            >
              <option value="fraction">Fraction (0.15)</option>
              <option value="percent">Percent (15)</option>
            </select>
          </label>
          <IntegerControl
            label="Decimal places"
            value={format.decimalPlaces}
            minimum={0}
            onChange={(decimalPlaces) =>
              onChange({ ...format, decimalPlaces })
            }
          />
          <CheckboxControl
            label="Show percent symbol"
            checked={format.showPercentSymbol}
            onChange={(showPercentSymbol) =>
              onChange({ ...format, showPercentSymbol })
            }
          />
        </div>
      )
    case 'masked-identifier':
      return (
        <div className="inspector-grid">
          <label>
            Mask
            <input
              required
              value={format.mask}
              onChange={(event) =>
                onChange({ ...format, mask: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Placeholder
            <input
              required
              maxLength={1}
              value={format.placeholder}
              onChange={(event) =>
                onChange({ ...format, placeholder: event.currentTarget.value })
              }
            />
          </label>
        </div>
      )
    case 'multiline-text':
      return (
        <div className="inspector-grid">
          <CheckboxControl
            label="Preserve new lines"
            checked={format.preserveNewlines}
            onChange={(preserveNewlines) =>
              onChange({ ...format, preserveNewlines })
            }
          />
          <IntegerControl
            label="Maximum lines"
            value={format.maximumLines}
            minimum={1}
            onChange={(maximumLines) =>
              onChange({ ...format, maximumLines })
            }
          />
        </div>
      )
  }
}

interface CheckboxControlProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function CheckboxControl({
  label,
  checked,
  onChange,
}: CheckboxControlProps) {
  return (
    <label className="inspector-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {label}
    </label>
  )
}

interface IntegerControlProps {
  label: string
  value: number
  minimum: number
  onChange: (value: number) => void
}

function IntegerControl({
  label,
  value,
  minimum,
  onChange,
}: IntegerControlProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.valueAsNumber

    if (Number.isInteger(nextValue) && nextValue >= minimum) {
      onChange(nextValue)
    }
  }

  return (
    <label>
      {label}
      <input
        type="number"
        min={minimum}
        step="1"
        value={value}
        onChange={handleChange}
      />
    </label>
  )
}

type NumericFormat = Extract<FieldFormat, { type: 'number' | 'money' }>

interface NegativeStyleControlProps {
  format: NumericFormat
  onChange: (format: FieldFormat) => void
}

function NegativeStyleControl({
  format,
  onChange,
}: NegativeStyleControlProps) {
  return (
    <label>
      Negative style
      <select
        value={format.negativeStyle}
        onChange={(event) =>
          onChange({
            ...format,
            negativeStyle: event.currentTarget
              .value as typeof format.negativeStyle,
          })
        }
      >
        <option value="minus">Minus sign</option>
        <option value="parentheses">Parentheses</option>
      </select>
    </label>
  )
}
