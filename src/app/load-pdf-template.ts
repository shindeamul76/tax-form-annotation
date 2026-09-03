import type { Diagnostic } from '../domain/diagnostics'
import { calculateSha256 } from '../io/sha256'
import {
  importAcroFormWidgets,
  type ImportedAcroFormField,
} from '../pdf/acroform-importer'
import type {
  PdfDocumentLoader,
  PdfTemplateDocument,
} from '../pdf/pdf-document'
import type { TemplateSession } from '../state/editor-state'

export interface LoadedPdfTemplate {
  session: TemplateSession
  document: PdfTemplateDocument
  importedFields: ImportedAcroFormField[]
  diagnostics: Diagnostic[]
}

export interface LoadPdfTemplateInput {
  fileName: string
  bytes: Uint8Array
  documentLoader: PdfDocumentLoader
}

export async function loadPdfTemplate({
  fileName,
  bytes,
  documentLoader,
}: LoadPdfTemplateInput): Promise<LoadedPdfTemplate> {
  const sha256 = await calculateSha256(bytes)
  const document = await documentLoader.load(bytes)

  try {
    const pages = await document.getPageMetadata()
    const widgets = await document.getWidgets()
    const importResult = importAcroFormWidgets({ pages, widgets })

    return {
      session: {
        fileName,
        bytes: Uint8Array.from(bytes),
        sha256,
        pages,
      },
      document,
      importedFields: importResult.fields,
      diagnostics: importResult.diagnostics,
    }
  } catch (error) {
    await document.destroy().catch(() => undefined)
    throw error
  }
}
