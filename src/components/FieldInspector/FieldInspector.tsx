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
import {
  RenderingStyleControls,
  ValueBehaviorControls,
} from '../RenderingControls/RenderingControls'
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
        <RenderingStyleControls
          style={effectiveStyle}
          onChange={onStyleChanged}
        />
      </details>

      <details className="inspector-section inspector-disclosure">
        <summary>Missing-value behavior</summary>
        <ValueBehaviorControls
          behavior={effectiveBehavior}
          onChange={onBehaviorChanged}
        />
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
