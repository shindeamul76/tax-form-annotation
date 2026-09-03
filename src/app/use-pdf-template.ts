import { useCallback, useEffect, useRef, useState } from 'react'
import type { PdfTemplateDocument } from '../pdf/pdf-document'
import { PdfDocumentError } from '../pdf/pdf-document'
import {
  loadPdfTemplate,
  type LoadedPdfTemplate,
} from './load-pdf-template'

export interface PdfTemplateLoadEvents {
  onLoadStarted: () => void
  onLoadSucceeded: (template: LoadedPdfTemplate) => void
  onLoadFailed: (errorMessage: string) => void
}

export interface PdfTemplateController {
  document: PdfTemplateDocument | null
  loadFile: (file: File) => Promise<void>
  loadUrl: (fileName: string, url: string) => Promise<void>
}

interface PdfByteSource {
  fileName: string
  readBytes: () => Promise<Uint8Array>
}

export function usePdfTemplate({
  onLoadStarted,
  onLoadSucceeded,
  onLoadFailed,
}: PdfTemplateLoadEvents): PdfTemplateController {
  const [document, setDocument] = useState<PdfTemplateDocument | null>(null)
  const activeDocumentRef = useRef<PdfTemplateDocument | null>(null)
  const requestNumberRef = useRef(0)

  const loadSource = useCallback(
    async (source: PdfByteSource) => {
      const requestNumber = requestNumberRef.current + 1
      requestNumberRef.current = requestNumber
      onLoadStarted()

      try {
        const [bytes, { pdfJsDocumentLoader }] = await Promise.all([
          source.readBytes(),
          import('../pdf/pdfjs-adapter'),
        ])
        const loadedTemplate = await loadPdfTemplate({
          fileName: source.fileName,
          bytes,
          documentLoader: pdfJsDocumentLoader,
        })

        if (requestNumber !== requestNumberRef.current) {
          await loadedTemplate.document.destroy()
          return
        }

        const previousDocument = activeDocumentRef.current
        activeDocumentRef.current = loadedTemplate.document
        setDocument(loadedTemplate.document)
        onLoadSucceeded(loadedTemplate)

        if (previousDocument !== null) {
          void previousDocument.destroy().catch(() => undefined)
        }
      } catch (error) {
        if (requestNumber !== requestNumberRef.current) {
          return
        }

        onLoadFailed(getLoadErrorMessage(error))
      }
    },
    [onLoadFailed, onLoadStarted, onLoadSucceeded],
  )

  const loadFile = useCallback(
    async (file: File) => {
      await loadSource({
        fileName: file.name,
        async readBytes() {
          return new Uint8Array(await file.arrayBuffer())
        },
      })
    },
    [loadSource],
  )

  const loadUrl = useCallback(
    async (fileName: string, url: string) => {
      await loadSource({
        fileName,
        async readBytes() {
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error('Bundled template request failed.')
          }

          return new Uint8Array(await response.arrayBuffer())
        },
      })
    },
    [loadSource],
  )

  useEffect(
    () => () => {
      requestNumberRef.current += 1
      const activeDocument = activeDocumentRef.current
      activeDocumentRef.current = null

      if (activeDocument !== null) {
        void activeDocument.destroy().catch(() => undefined)
      }
    },
    [],
  )

  return { document, loadFile, loadUrl }
}

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof PdfDocumentError) {
    return error.message
  }

  return 'The PDF template could not be read. Choose a valid PDF and try again.'
}
