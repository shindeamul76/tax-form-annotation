import type {
  AnnotationDefaults,
  FieldBehavior,
  FieldStyle,
} from '../../domain/annotation-types'
import { validateAnnotationDefaults } from '../../domain/annotation-defaults-validation'
import {
  RenderingStyleControls,
  ValueBehaviorControls,
} from '../RenderingControls/RenderingControls'
import './AnnotationDefaultsEditor.css'

interface AnnotationDefaultsEditorProps {
  defaults: AnnotationDefaults
  onStyleChanged: (style: Partial<FieldStyle>) => void
  onBehaviorChanged: (behavior: Partial<FieldBehavior>) => void
}

export function AnnotationDefaultsEditor({
  defaults,
  onStyleChanged,
  onBehaviorChanged,
}: AnnotationDefaultsEditorProps) {
  const diagnostics = validateAnnotationDefaults(defaults)
  const isValid = diagnostics.length === 0

  return (
    <section
      className="sidebar-card defaults-editor"
      aria-labelledby="defaults-editor-heading"
    >
      <div className="sidebar-card__heading">
        <div>
          <h3 id="defaults-editor-heading">Annotation defaults</h3>
          <p>Inherited by every field unless that field overrides a value.</p>
        </div>
        <span
          className={`defaults-status defaults-status--${isValid ? 'valid' : 'invalid'}`}
        >
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>

      <details className="defaults-disclosure">
        <summary>Rendering style</summary>
        <RenderingStyleControls
          style={defaults.style}
          onChange={onStyleChanged}
        />
      </details>

      <details className="defaults-disclosure">
        <summary>Missing-value behavior</summary>
        <ValueBehaviorControls
          behavior={defaults.behavior}
          onChange={onBehaviorChanged}
        />
      </details>

      {isValid ? null : (
        <ul className="defaults-issue-list" aria-label="Default-setting issues">
          {diagnostics.map((diagnostic) => (
            <li key={diagnostic.code}>{diagnostic.message}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
