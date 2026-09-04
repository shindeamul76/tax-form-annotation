import type { AnnotationDefaults } from './annotation-types'
import type { Diagnostic } from './diagnostics'

const hexColorPattern = /^#[A-Fa-f0-9]{6}$/u

export function validateAnnotationDefaults(
  defaults: AnnotationDefaults,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const { style } = defaults

  if (style.fontFamily.trim().length === 0) {
    diagnostics.push(
      createDefaultsDiagnostic(
        'DEFAULT_FONT_FAMILY_REQUIRED',
        'Enter a font family.',
        '/defaults/style/fontFamily',
      ),
    )
  }

  addPositiveNumberDiagnostic(
    diagnostics,
    style.fontSizePt,
    'DEFAULT_FONT_SIZE_INVALID',
    'Font size must be greater than zero.',
    '/defaults/style/fontSizePt',
  )
  addPositiveNumberDiagnostic(
    diagnostics,
    style.minimumFontSizePt,
    'DEFAULT_MINIMUM_FONT_SIZE_INVALID',
    'Minimum font size must be greater than zero.',
    '/defaults/style/minimumFontSizePt',
  )

  if (style.minimumFontSizePt > style.fontSizePt) {
    diagnostics.push(
      createDefaultsDiagnostic(
        'DEFAULT_MINIMUM_FONT_SIZE_EXCEEDS_FONT_SIZE',
        'Minimum font size cannot exceed the preferred font size.',
        '/defaults/style/minimumFontSizePt',
      ),
    )
  }

  if (!Number.isFinite(style.paddingPt) || style.paddingPt < 0) {
    diagnostics.push(
      createDefaultsDiagnostic(
        'DEFAULT_PADDING_INVALID',
        'Padding must be zero or greater.',
        '/defaults/style/paddingPt',
      ),
    )
  }

  if (!hexColorPattern.test(style.color)) {
    diagnostics.push(
      createDefaultsDiagnostic(
        'DEFAULT_COLOR_INVALID',
        'Text color must be a six-digit hexadecimal color.',
        '/defaults/style/color',
      ),
    )
  }

  if (
    !Number.isFinite(style.rotationDegrees) ||
    style.rotationDegrees < -360 ||
    style.rotationDegrees > 360
  ) {
    diagnostics.push(
      createDefaultsDiagnostic(
        'DEFAULT_ROTATION_INVALID',
        'Rotation must be between -360 and 360 degrees.',
        '/defaults/style/rotationDegrees',
      ),
    )
  }

  addPositiveNumberDiagnostic(
    diagnostics,
    style.lineHeight,
    'DEFAULT_LINE_HEIGHT_INVALID',
    'Line height must be greater than zero.',
    '/defaults/style/lineHeight',
  )

  return diagnostics
}

function addPositiveNumberDiagnostic(
  diagnostics: Diagnostic[],
  value: number,
  code: string,
  message: string,
  path: string,
) {
  if (!Number.isFinite(value) || value <= 0) {
    diagnostics.push(createDefaultsDiagnostic(code, message, path))
  }
}

function createDefaultsDiagnostic(
  code: string,
  message: string,
  path: string,
): Diagnostic {
  return { severity: 'error', code, message, path }
}
