import type { AnnotationDraft } from '../domain/annotation-draft'
import type { JsonValue, NormalizedBox } from '../domain/annotation-types'
import type { ScreenBoxPx } from '../domain/coordinates'
import type { Diagnostic } from '../domain/diagnostics'
import type { LoadedTemplateMetadata } from '../domain/template-types'

export interface TemplateSession extends LoadedTemplateMetadata {
  bytes: Uint8Array
}

export interface SampleDatasetSession {
  fileName: string
  value: JsonValue
}

export interface SampleDatasetState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  session: SampleDatasetSession | null
  errorMessage: string | null
}

export type TemplateLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface TemplateLoadState {
  status: TemplateLoadStatus
  errorMessage: string | null
}

export type EditorTool = 'select' | 'draw'

export interface PendingFieldTransform {
  draftId: string
  box: NormalizedBox
}

export interface EditorUiState {
  currentPage: number
  zoom: number
  activeTool: EditorTool
  selectedDraftId: string | null
  pendingSelection: ScreenBoxPx | null
  pendingFieldTransform: PendingFieldTransform | null
  previewEnabled: boolean
  showDetectedFields: boolean
}

export interface EditorState {
  template: TemplateSession | null
  templateLoad: TemplateLoadState
  draft: AnnotationDraft
  sampleDataset: SampleDatasetState
  ui: EditorUiState
  diagnostics: Diagnostic[]
  isDirty: boolean
}

export const MINIMUM_EDITOR_ZOOM = 0.5
export const MAXIMUM_EDITOR_ZOOM = 3

export function createInitialEditorState(): EditorState {
  return {
    template: null,
    templateLoad: {
      status: 'idle',
      errorMessage: null,
    },
    draft: {
      annotationVersion: '1.0',
      form: {
        pages: [],
      },
      dataContract: {
        id: 'com.tax-form-annotator.taxpayer-return',
        version: '1.0',
      },
      coordinateSystem: {
        unit: 'normalized',
        origin: 'top-left',
        pageNumbering: 'one-based',
      },
      defaults: {
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
      },
      fields: [],
    },
    sampleDataset: {
      status: 'idle',
      session: null,
      errorMessage: null,
    },
    ui: {
      currentPage: 1,
      zoom: 1.1,
      activeTool: 'select',
      selectedDraftId: null,
      pendingSelection: null,
      pendingFieldTransform: null,
      previewEnabled: false,
      showDetectedFields: true,
    },
    diagnostics: [],
    isDirty: false,
  }
}
