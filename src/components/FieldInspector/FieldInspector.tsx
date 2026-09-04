import type { ChangeEvent } from 'react'
import type { DraftFieldAnnotation } from '../../domain/annotation-draft'
import type {
  FieldBehavior,
  FieldStyle,
  JsonPrimitive,
  NormalizedBox,
  ValueSource,
} from '../../domain/annotation-types'
import { isNormalizedBoxWithinPage } from '../../domain/coordinates'
import {
  createDefaultFieldFormat,
  type FieldFormatType,
} from '../../domain/field-format-defaults'
import { isValidFieldFormat } from '../../domain/field-format-validation'
import { isValidJsonPointerSyntax } from '../../domain/json-pointer'
import type { DraftFieldMappingPatch } from '../../state/editor-actions'
import { FieldFormatEditor } from './FieldFormatEditor'
import './FieldInspector.css'

interface FieldInspectorProps {
  field: DraftFieldAnnotation
  defaultStyle: FieldStyle
  defaultBehavior: FieldBehavior
  hasDuplicateId: boolean
  onMappingChanged: (mapping: DraftFieldMappingPatch) => void
  onBoxChanged: (box: NormalizedBox) => void
  onStyleChanged: (style: Partial<FieldStyle>) => void
  onBehaviorChanged: (behavior: Partial<FieldBehavior>) => void
  onRemove: () => void
}

const FORMAT_OPTIONS: { value: FieldFormatType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Money' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'masked-identifier', label: 'Masked identifier' },
  { value: 'multiline-text', label: 'Multiline text' },
]

export function FieldInspector({
  field,
  defaultStyle,
  defaultBehavior,
  hasDuplicateId,
  onMappingChanged,
  onBoxChanged,
  onStyleChanged,
  onBehaviorChanged,
  onRemove,
}: FieldInspectorProps) {
  const mappingIssues = getMappingIssues(field, hasDuplicateId)
  const effectiveStyle = { ...defaultStyle, ...field.style }
  const effectiveBehavior = { ...defaultBehavior, ...field.behavior }

  const handleSourceKindChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const sourceKind = event.currentTarget.value

    if (sourceKind === 'json-pointer') {
      onMappingChanged({ source: { kind: sourceKind, pointer: '' } })
    } else if (sourceKind === 'constant') {
      onMappingChanged({ source: { kind: sourceKind, value: '' } })
    } else {
      onMappingChanged({ source: undefined })
    }
  }

  const handleFormatTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const formatType = event.currentTarget.value

    onMappingChanged({
      format:
        formatType === ''
          ? undefined
          : createDefaultFieldFormat(formatType as FieldFormatType),
    })
  }

  return (
    <section className="sidebar-card field-inspector" aria-labelledby="field-inspector-heading">
      <div className="sidebar-card__heading">
        <div>
          <h3 id="field-inspector-heading">Field inspector</h3>
          <p title={field.originalPdfFieldName}>
            {field.originalPdfFieldName ?? field.draftId}
          </p>
        </div>
        <span className={`field-kind field-kind--${field.mappingStatus}`}>
          {field.mappingStatus}
        </span>
      </div>

      <div className="inspector-section">
        <h4>Mapping</h4>
        <label>
          Field ID <RequiredMarker />
          <input
            value={field.id ?? ''}
            placeholder="form1040.line1a.wages"
            onChange={(event) =>
              onMappingChanged({ id: event.currentTarget.value })
            }
          />
        </label>
        <label>
          Label <RequiredMarker />
          <input
            value={field.label ?? ''}
            placeholder="Line 1a wages"
            onChange={(event) =>
              onMappingChanged({ label: event.currentTarget.value })
            }
          />
        </label>
        <label>
          Description
          <textarea
            rows={2}
            value={field.description ?? ''}
            placeholder="Optional authoring context"
            onChange={(event) =>
              onMappingChanged({
                description: event.currentTarget.value || undefined,
              })
            }
          />
        </label>
        <label>
          Value source <RequiredMarker />
          <select
            value={field.source?.kind ?? ''}
            onChange={handleSourceKindChange}
          >
            <option value="">Choose a source</option>
            <option value="json-pointer">JSON Pointer</option>
            <option value="constant">Constant value</option>
          </select>
        </label>

        {field.source?.kind === 'json-pointer' ? (
          <label>
            JSON Pointer <RequiredMarker />
            <input
              className="monospace-input"
              value={field.source.pointer}
              placeholder="/returns/federal/2025/income/wages"
              onChange={(event) =>
                onMappingChanged({
                  source: {
                    kind: 'json-pointer',
                    pointer: event.currentTarget.value,
                  },
                })
              }
            />
          </label>
        ) : null}

        {field.source?.kind === 'constant' ? (
          <ConstantSourceEditor
            source={field.source}
            onChange={(source) => onMappingChanged({ source })}
          />
        ) : null}

        <label>
          Format <RequiredMarker />
          <select
            value={field.format?.type ?? ''}
            onChange={handleFormatTypeChange}
          >
            <option value="">Choose a format</option>
            {FORMAT_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {field.format === undefined ? null : (
          <FieldFormatEditor
            format={field.format}
            onChange={(format) => onMappingChanged({ format })}
          />
        )}

        {mappingIssues.length === 0 ? (
          <p className="mapping-valid-message">This field is ready to preview.</p>
        ) : (
          <ul className="mapping-issue-list" aria-label="Mapping issues">
            {mappingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>

      <details className="inspector-section inspector-disclosure">
        <summary>Exact coordinates</summary>
        <p>Normalized values use a top-left origin and must stay within 0–1.</p>
        <div className="coordinate-input-grid">
          <CoordinateInput field={field} coordinate="x" onChange={onBoxChanged} />
          <CoordinateInput field={field} coordinate="y" onChange={onBoxChanged} />
          <CoordinateInput
            field={field}
            coordinate="width"
            onChange={onBoxChanged}
          />
          <CoordinateInput
            field={field}
            coordinate="height"
            onChange={onBoxChanged}
          />
        </div>
      </details>

      <details className="inspector-section inspector-disclosure">
        <summary>Rendering overrides</summary>
        <p>Editing a value creates a field-level override of the form default.</p>
        <div className="inspector-grid">
          <label>
            Font family
            <input
              value={effectiveStyle.fontFamily}
              onChange={(event) =>
                onStyleChanged({ fontFamily: event.currentTarget.value })
              }
            />
          </label>
          <PositiveNumberControl
            label="Font size (pt)"
            value={effectiveStyle.fontSizePt}
            onChange={(fontSizePt) => onStyleChanged({ fontSizePt })}
          />
          <PositiveNumberControl
            label="Minimum size (pt)"
            value={effectiveStyle.minimumFontSizePt}
            onChange={(minimumFontSizePt) =>
              onStyleChanged({ minimumFontSizePt })
            }
          />
          <label>
            Horizontal alignment
            <select
              value={effectiveStyle.horizontalAlign}
              onChange={(event) =>
                onStyleChanged({
                  horizontalAlign: event.currentTarget
                    .value as FieldStyle['horizontalAlign'],
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label>
            Vertical alignment
            <select
              value={effectiveStyle.verticalAlign}
              onChange={(event) =>
                onStyleChanged({
                  verticalAlign: event.currentTarget
                    .value as FieldStyle['verticalAlign'],
                })
              }
            >
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
          <NonNegativeNumberControl
            label="Padding (pt)"
            value={effectiveStyle.paddingPt}
            onChange={(paddingPt) => onStyleChanged({ paddingPt })}
          />
          <label>
            Text color
            <input
              type="color"
              value={effectiveStyle.color}
              onChange={(event) =>
                onStyleChanged({ color: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Overflow
            <select
              value={effectiveStyle.overflow}
              onChange={(event) =>
                onStyleChanged({
                  overflow: event.currentTarget.value as FieldStyle['overflow'],
                })
              }
            >
              <option value="shrink">Shrink</option>
              <option value="clip">Clip</option>
              <option value="wrap">Wrap</option>
              <option value="error">Error</option>
            </select>
          </label>
          <NumberControl
            label="Rotation (degrees)"
            value={effectiveStyle.rotationDegrees}
            minimum={-360}
            maximum={360}
            onChange={(rotationDegrees) => onStyleChanged({ rotationDegrees })}
          />
          <PositiveNumberControl
            label="Line height"
            value={effectiveStyle.lineHeight}
            step={0.1}
            onChange={(lineHeight) => onStyleChanged({ lineHeight })}
          />
        </div>
      </details>

      <details className="inspector-section inspector-disclosure">
        <summary>Missing-value behavior</summary>
        <div className="inspector-grid">
          <MissingBehaviorControl
            label="When missing"
            value={effectiveBehavior.onMissing}
            onChange={(onMissing) => onBehaviorChanged({ onMissing })}
          />
          <MissingBehaviorControl
            label="When null"
            value={effectiveBehavior.onNull}
            onChange={(onNull) => onBehaviorChanged({ onNull })}
          />
          <label className="inspector-checkbox">
            <input
              type="checkbox"
              checked={effectiveBehavior.printZero}
              onChange={(event) =>
                onBehaviorChanged({ printZero: event.currentTarget.checked })
              }
            />
            Print numeric zero
          </label>
        </div>
      </details>

      <button
        className="delete-field-button"
        type="button"
        onClick={() => {
          if (window.confirm('Delete this field annotation?')) {
            onRemove()
          }
        }}
      >
        Delete field
      </button>
    </section>
  )
}

function RequiredMarker() {
  return <span className="required-marker">required</span>
}

interface ConstantSourceEditorProps {
  source: Extract<ValueSource, { kind: 'constant' }>
  onChange: (source: Extract<ValueSource, { kind: 'constant' }>) => void
}

function ConstantSourceEditor({
  source,
  onChange,
}: ConstantSourceEditorProps) {
  const valueType = getPrimitiveType(source.value)

  return (
    <div className="inspector-grid">
      <label>
        Constant type
        <select
          value={valueType}
          onChange={(event) =>
            onChange({
              kind: 'constant',
              value: createPrimitiveValue(
                event.currentTarget.value as PrimitiveType,
              ),
            })
          }
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="null">Null</option>
        </select>
      </label>
      <ConstantValueControl source={source} onChange={onChange} />
    </div>
  )
}

function ConstantValueControl({
  source,
  onChange,
}: ConstantSourceEditorProps) {
  if (typeof source.value === 'boolean') {
    return (
      <label>
        Constant value
        <select
          value={String(source.value)}
          onChange={(event) =>
            onChange({
              kind: 'constant',
              value: event.currentTarget.value === 'true',
            })
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
    )
  }

  if (source.value === null) {
    return <p className="constant-null-message">The constant value is null.</p>
  }

  return (
    <label>
      Constant value
      <input
        type={typeof source.value === 'number' ? 'number' : 'text'}
        value={source.value}
        onChange={(event) => {
          if (typeof source.value === 'number') {
            const value = event.currentTarget.valueAsNumber

            if (Number.isFinite(value)) {
              onChange({ kind: 'constant', value })
            }
          } else {
            onChange({ kind: 'constant', value: event.currentTarget.value })
          }
        }}
      />
    </label>
  )
}

type PrimitiveType = 'string' | 'number' | 'boolean' | 'null'

function getPrimitiveType(value: JsonPrimitive): PrimitiveType {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  return 'string'
}

function createPrimitiveValue(type: PrimitiveType): JsonPrimitive {
  switch (type) {
    case 'string':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return true
    case 'null':
      return null
  }
}

interface CoordinateInputProps {
  field: DraftFieldAnnotation
  coordinate: keyof NormalizedBox
  onChange: (box: NormalizedBox) => void
}

function CoordinateInput({
  field,
  coordinate,
  onChange,
}: CoordinateInputProps) {
  const value = field.box[coordinate]

  return (
    <label>
      {coordinate}
      <input
        key={`${field.draftId}:${coordinate}:${value}`}
        type="number"
        min={coordinate === 'width' || coordinate === 'height' ? 0.000001 : 0}
        max="1"
        step="0.0001"
        defaultValue={value.toFixed(6)}
        onBlur={(event) => {
          const nextValue = event.currentTarget.valueAsNumber
          const nextBox = { ...field.box, [coordinate]: nextValue }

          if (Number.isFinite(nextValue) && isNormalizedBoxWithinPage(nextBox)) {
            event.currentTarget.setCustomValidity('')
            onChange(nextBox)
          } else {
            event.currentTarget.setCustomValidity(
              'Enter a normalized value that keeps the entire box inside the page.',
            )
            event.currentTarget.reportValidity()
            event.currentTarget.value = value.toFixed(6)
          }
        }}
      />
    </label>
  )
}

interface NumberControlProps {
  label: string
  value: number
  minimum?: number
  maximum?: number
  step?: number
  onChange: (value: number) => void
}

function NumberControl({
  label,
  value,
  minimum,
  maximum,
  step = 1,
  onChange,
}: NumberControlProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber

          if (
            Number.isFinite(nextValue) &&
            (minimum === undefined || nextValue >= minimum) &&
            (maximum === undefined || nextValue <= maximum)
          ) {
            onChange(nextValue)
          }
        }}
      />
    </label>
  )
}

function PositiveNumberControl(
  props: Omit<NumberControlProps, 'minimum'>,
) {
  return <NumberControl {...props} minimum={Number.EPSILON} />
}

function NonNegativeNumberControl(
  props: Omit<NumberControlProps, 'minimum'>,
) {
  return <NumberControl {...props} minimum={0} />
}

interface MissingBehaviorControlProps {
  label: string
  value: FieldBehavior['onMissing']
  onChange: (value: FieldBehavior['onMissing']) => void
}

function MissingBehaviorControl({
  label,
  value,
  onChange,
}: MissingBehaviorControlProps) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as FieldBehavior['onMissing'])
        }
      >
        <option value="blank">Leave blank</option>
        <option value="warn">Warning</option>
        <option value="error">Error</option>
      </select>
    </label>
  )
}

function getMappingIssues(
  field: DraftFieldAnnotation,
  hasDuplicateId: boolean,
): string[] {
  const issues: string[] = []

  if (field.id?.trim() === '') {
    issues.push('Enter a field ID.')
  } else if (field.id === undefined) {
    issues.push('Enter a field ID.')
  } else if (hasDuplicateId) {
    issues.push('Use a unique field ID.')
  }

  if (field.label?.trim() === '' || field.label === undefined) {
    issues.push('Enter a human-readable label.')
  }

  if (field.source === undefined) {
    issues.push('Choose a value source.')
  } else if (
    field.source.kind === 'json-pointer' &&
    !isValidJsonPointerSyntax(field.source.pointer)
  ) {
    issues.push('Enter a valid absolute JSON Pointer beginning with /.')
  }

  if (field.format === undefined) {
    issues.push('Choose a field format.')
  } else if (!isValidFieldFormat(field.format)) {
    issues.push('Correct the format options.')
  }

  return issues
}
