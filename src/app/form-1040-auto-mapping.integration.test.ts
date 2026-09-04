import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import {
  findAutomaticFieldMappings,
  MINIMUM_PROFILE_BOX_OVERLAP,
} from '../domain/field-auto-mapping'
import type { LoadedTemplatePageMetadata } from '../domain/template-types'
import { importAcroFormWidgets } from '../pdf/acroform-importer'
import type { PdfWidget } from '../pdf/pdf-document'
import { createAcroFormDraftFields } from './create-acroform-drafts'
import { findKnownTemplateProfile } from './known-template-profiles'

const FORM_1040_2025_SHA256 =
  '3d31c226df0d189ced80e039d01cf0f8820c1019681a0f0ca6264de277b7e982'

describe('included Form 1040 automatic mapping', () => {
  it('matches all six sample mappings against the actual PDF widgets', async () => {
    const templateBytes = await readFile(
      resolve(process.cwd(), 'examples/templates/f1040-2025.pdf'),
    )
    const document = await getDocument({
      data: Uint8Array.from(templateBytes),
    }).promise

    try {
      const { pages, widgets } = await readTemplateWidgets(document)
      const imported = importAcroFormWidgets({ pages, widgets })
      const profile = findKnownTemplateProfile(FORM_1040_2025_SHA256)

      expect(profile).toBeDefined()

      const mappings = findAutomaticFieldMappings(
        createAcroFormDraftFields(imported.fields),
        profile?.fields ?? [],
      )

      expect(imported.fields).toHaveLength(199)
      expect(mappings.map(({ profileField }) => profileField.id).sort()).toEqual(
        profile?.fields.map(({ id }) => id).sort(),
      )
      expect(
        mappings.every(
          ({ overlapScore }) => overlapScore >= MINIMUM_PROFILE_BOX_OVERLAP,
        ),
      ).toBe(true)

      /*
       * Every profile box still tracks its widget rect exactly, apart from the
       * taxpayer SSN. That widget is a nine-cell comb whose rectangle is wider
       * than the printed cells, so the profile narrows the box to the printed
       * grid and the digits land between the separator ticks. Pinning the
       * exception keeps this test catching accidental box drift elsewhere.
       */
      const looseMappings = mappings
        .filter(({ overlapScore }) => overlapScore <= 0.99)
        .map(({ profileField }) => profileField.id)

      expect(looseMappings).toEqual(['form1040.taxpayer.ssn'])
    } finally {
      await document.destroy()
    }
  }, 20_000)
})

interface PdfJsDocument {
  numPages: number
  getPage(pageNumber: number): Promise<PdfJsPage>
}

interface PdfJsPage {
  getViewport(input: { scale: number }): PdfJsViewport
  getAnnotations(): Promise<unknown[]>
  cleanup(): void
}

interface PdfJsViewport {
  width: number
  height: number
  rotation: number
  convertToViewportRectangle(
    rectangle: [number, number, number, number],
  ): number[]
}

interface PdfJsWidgetAnnotation {
  id?: string
  subtype: string
  fieldName?: string
  fieldType?: string
  checkBox?: boolean
  radioButton?: boolean
  rect: [number, number, number, number]
}

async function readTemplateWidgets(document: PdfJsDocument): Promise<{
  pages: LoadedTemplatePageMetadata[]
  widgets: PdfWidget[]
}> {
  const pages: LoadedTemplatePageMetadata[] = []
  const widgets: PdfWidget[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    const annotations = await page.getAnnotations()
    pages.push({
      pageNumber,
      widthPt: viewport.width,
      heightPt: viewport.height,
      rotationDegrees: viewport.rotation,
    })

    for (const [annotationIndex, value] of annotations.entries()) {
      if (!isWidgetAnnotation(value)) {
        continue
      }

      const rectangle = viewport.convertToViewportRectangle(value.rect)
      widgets.push({
        pdfId: value.id ?? `${pageNumber}-${annotationIndex}`,
        fieldName: value.fieldName ?? `Unnamed field ${annotationIndex}`,
        pageNumber,
        kind: classifyWidget(value),
        rectPt: {
          x1Pt: rectangle[0],
          y1Pt: rectangle[1],
          x2Pt: rectangle[2],
          y2Pt: rectangle[3],
        },
      })
    }

    page.cleanup()
  }

  return { pages, widgets }
}

function isWidgetAnnotation(value: unknown): value is PdfJsWidgetAnnotation {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const annotation = value as Partial<PdfJsWidgetAnnotation>
  return (
    annotation.subtype === 'Widget' &&
    Array.isArray(annotation.rect) &&
    annotation.rect.length === 4 &&
    annotation.rect.every((coordinate) => Number.isFinite(coordinate))
  )
}

function classifyWidget(
  annotation: PdfJsWidgetAnnotation,
): PdfWidget['kind'] {
  if (annotation.checkBox === true) {
    return 'checkbox'
  }

  if (annotation.radioButton === true) {
    return 'radio'
  }

  return annotation.fieldType === 'Tx' ? 'text' : 'unknown'
}
