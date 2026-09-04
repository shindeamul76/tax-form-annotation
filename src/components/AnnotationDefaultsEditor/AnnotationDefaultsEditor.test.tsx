import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  AnnotationDefaults,
  FieldBehavior,
  FieldStyle,
} from '../../domain/annotation-types'
import { AnnotationDefaultsEditor } from './AnnotationDefaultsEditor'

const defaults: AnnotationDefaults = {
  style: {
    fontFamily: 'Helvetica',
    fontSizePt: 9,
    minimumFontSizePt: 6,
    horizontalAlign: 'left',
    verticalAlign: 'middle',
    paddingPt: 1,
    color: '#000000',
    overflow: 'shrink',
    rotationDegrees: 0,
    lineHeight: 1.2,
  },
  behavior: {
    onMissing: 'warn',
    onNull: 'blank',
    printZero: false,
  },
}

describe('AnnotationDefaultsEditor', () => {
  it('shows valid defaults and explains their inheritance', () => {
    renderEditor()

    expect(screen.getByText('Valid')).toBeInTheDocument()
    expect(
      screen.getByText(/Inherited by every field/),
    ).toBeInTheDocument()
  })

  it('emits rendering-style and missing-value behavior changes', () => {
    const onStyleChanged = vi.fn<(style: Partial<FieldStyle>) => void>()
    const onBehaviorChanged = vi.fn<
      (behavior: Partial<FieldBehavior>) => void
    >()
    renderEditor({ onStyleChanged, onBehaviorChanged })

    fireEvent.change(screen.getByLabelText('Font family'), {
      target: { value: 'Times-Roman' },
    })
    fireEvent.change(screen.getByLabelText('Horizontal alignment'), {
      target: { value: 'right' },
    })
    fireEvent.change(screen.getByLabelText('When missing'), {
      target: { value: 'error' },
    })
    fireEvent.click(screen.getByLabelText('Print numeric zero'))

    expect(onStyleChanged).toHaveBeenCalledWith({
      fontFamily: 'Times-Roman',
    })
    expect(onStyleChanged).toHaveBeenCalledWith({ horizontalAlign: 'right' })
    expect(onBehaviorChanged).toHaveBeenCalledWith({ onMissing: 'error' })
    expect(onBehaviorChanged).toHaveBeenCalledWith({ printZero: true })
  })

  it('shows incompatible default font sizes as an authoring issue', () => {
    renderEditor({
      defaults: {
        ...defaults,
        style: {
          ...defaults.style,
          fontSizePt: 6,
          minimumFontSizePt: 9,
        },
      },
    })

    expect(screen.getByText('Invalid')).toBeInTheDocument()
    expect(screen.getByLabelText('Default-setting issues')).toHaveTextContent(
      'Minimum font size cannot exceed',
    )
  })
})

interface EditorOverrides {
  defaults?: AnnotationDefaults
  onStyleChanged?: (style: Partial<FieldStyle>) => void
  onBehaviorChanged?: (behavior: Partial<FieldBehavior>) => void
}

function renderEditor(overrides: EditorOverrides = {}) {
  return render(
    <AnnotationDefaultsEditor
      defaults={overrides.defaults ?? defaults}
      onStyleChanged={overrides.onStyleChanged ?? vi.fn()}
      onBehaviorChanged={overrides.onBehaviorChanged ?? vi.fn()}
    />,
  )
}
