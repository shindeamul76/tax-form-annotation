import { describe, expect, it } from 'vitest'
import annotationExample from '../../examples/annotations/form-1040-2025.annotation.json'
import { validateAnnotationSchema } from './annotation-schema-validation'

describe('validateAnnotationSchema', () => {
  it('accepts the included annotation example', () => {
    expect(validateAnnotationSchema(annotationExample)).toEqual([])
  })

  it('turns Ajv errors into project diagnostics with JSON Pointer paths', () => {
    const invalidAnnotation = structuredClone(annotationExample)
    Reflect.deleteProperty(invalidAnnotation.form, 'title')
    Reflect.set(invalidAnnotation, 'unexpected', true)

    const diagnostics = validateAnnotationSchema(invalidAnnotation)

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SCHEMA_REQUIRED',
          path: '/form/title',
        }),
        expect.objectContaining({
          code: 'SCHEMA_ADDITIONAL_PROPERTIES',
          path: '/unexpected',
        }),
      ]),
    )
  })
})
