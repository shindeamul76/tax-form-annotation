import type { AnnotationDocument } from '../domain/annotation-types'
import { createFormArtifactFileName } from './output-file-name'

export const ANNOTATION_JSON_MIME_TYPE = 'application/json;charset=utf-8'

export interface AnnotationJsonFile {
  fileName: string
  contents: string
}

export function createAnnotationJsonFile(
  annotation: AnnotationDocument,
): AnnotationJsonFile {
  return {
    fileName: createFormArtifactFileName(annotation.form, 'annotation.json'),
    contents: `${JSON.stringify(annotation, null, 2)}\n`,
  }
}
