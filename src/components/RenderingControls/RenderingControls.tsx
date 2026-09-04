import type {
  FieldBehavior,
  FieldStyle,
} from '../../domain/annotation-types'
import './RenderingControls.css'

interface RenderingStyleControlsProps {
  style: FieldStyle
  onChange: (style: Partial<FieldStyle>) => void
}

export function RenderingStyleControls({
  style,
  onChange,
}: RenderingStyleControlsProps) {
  return (
    <div className="rendering-controls-grid">
      <label>
        Font family
        <input
          value={style.fontFamily}
          onChange={(event) =>
            onChange({ fontFamily: event.currentTarget.value })
          }
        />
      </label>
      <PositiveNumberControl
        label="Font size (pt)"
        value={style.fontSizePt}
        onChange={(fontSizePt) => onChange({ fontSizePt })}
      />
      <PositiveNumberControl
        label="Minimum size (pt)"
        value={style.minimumFontSizePt}
        onChange={(minimumFontSizePt) => onChange({ minimumFontSizePt })}
      />
      <label>
        Horizontal alignment
        <select
          value={style.horizontalAlign}
          onChange={(event) =>
            onChange({
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
          value={style.verticalAlign}
          onChange={(event) =>
            onChange({
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
        value={style.paddingPt}
        onChange={(paddingPt) => onChange({ paddingPt })}
      />
      <label>
        Text color
        <input
          type="color"
          value={style.color}
          onChange={(event) => onChange({ color: event.currentTarget.value })}
        />
      </label>
      <label>
        Overflow
        <select
          value={style.overflow}
          onChange={(event) =>
            onChange({
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
        value={style.rotationDegrees}
        minimum={-360}
        maximum={360}
        onChange={(rotationDegrees) => onChange({ rotationDegrees })}
      />
      <PositiveNumberControl
        label="Line height"
        value={style.lineHeight}
        step={0.1}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
    </div>
  )
}

interface ValueBehaviorControlsProps {
  behavior: FieldBehavior
  onChange: (behavior: Partial<FieldBehavior>) => void
}

export function ValueBehaviorControls({
  behavior,
  onChange,
}: ValueBehaviorControlsProps) {
  return (
    <div className="rendering-controls-grid">
      <MissingBehaviorControl
        label="When missing"
        value={behavior.onMissing}
        onChange={(onMissing) => onChange({ onMissing })}
      />
      <MissingBehaviorControl
        label="When null"
        value={behavior.onNull}
        onChange={(onNull) => onChange({ onNull })}
      />
      <label className="rendering-checkbox">
        <input
          type="checkbox"
          checked={behavior.printZero}
          onChange={(event) =>
            onChange({ printZero: event.currentTarget.checked })
          }
        />
        Print numeric zero
      </label>
    </div>
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
