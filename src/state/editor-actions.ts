import type {
  AnnotationDocument,
  DataContract,
  FieldBehavior,
  FieldFormat,
  FieldStyle,
  NormalizedBox,
  ValueSource,
} from '../domain/annotation-types'
import type {
  DraftFieldAnnotation,
  DraftFormMetadata,
} from '../domain/annotation-draft'
import type { ScreenBoxPx } from '../domain/coordinates'
import type { Diagnostic } from '../domain/diagnostics'
import type { AutomaticFieldMapping } from '../domain/field-auto-mapping'
import type {
  EditorTool,
  PendingFieldTransform,
  SampleDatasetSession,
  TemplateSession,
} from './editor-state'

export interface DraftFieldMappingPatch {
  id?: string
  label?: string
  description?: string
  source?: ValueSource
  format?: FieldFormat
}

export type EditorAction =
  | { type: 'template/loadStarted' }
  | { type: 'template/loadSucceeded'; session: TemplateSession }
  | { type: 'template/loadFailed'; errorMessage: string }
  | {
      type: 'form/metadataChanged'
      metadata: Partial<
        Pick<DraftFormMetadata, 'formId' | 'title' | 'taxYear' | 'revision'>
      >
    }
  | { type: 'dataContract/changed'; dataContract: DataContract }
  | { type: 'defaults/styleChanged'; style: Partial<FieldStyle> }
  | { type: 'defaults/behaviorChanged'; behavior: Partial<FieldBehavior> }
  | { type: 'fields/imported'; fields: DraftFieldAnnotation[] }
  | { type: 'fields/automaticallyMapped'; mappings: AutomaticFieldMapping[] }
  | { type: 'fields/unmappedExcluded' }
  | { type: 'field/created'; field: DraftFieldAnnotation }
  | { type: 'field/selected'; draftId: string | null }
  | { type: 'field/boxChanged'; draftId: string; box: NormalizedBox }
  | {
      type: 'field/mappingChanged'
      draftId: string
      mapping: DraftFieldMappingPatch
    }
  | {
      type: 'field/styleChanged'
      draftId: string
      style: Partial<FieldStyle>
    }
  | {
      type: 'field/behaviorChanged'
      draftId: string
      behavior: Partial<FieldBehavior>
    }
  | { type: 'field/removed'; draftId: string }
  | { type: 'dataset/loadStarted' }
  | { type: 'dataset/loaded'; session: SampleDatasetSession }
  | { type: 'dataset/loadFailed'; errorMessage: string }
  | { type: 'dataset/cleared' }
  | { type: 'annotation/imported'; annotation: AnnotationDocument }
  | { type: 'ui/pageChanged'; pageNumber: number }
  | { type: 'ui/zoomChanged'; zoom: number }
  | { type: 'ui/toolChanged'; tool: EditorTool }
  | { type: 'ui/pendingSelectionChanged'; selection: ScreenBoxPx | null }
  | {
      type: 'ui/pendingFieldTransformChanged'
      transform: PendingFieldTransform | null
    }
  | { type: 'ui/previewChanged'; enabled: boolean }
  | { type: 'ui/detectedFieldsChanged'; visible: boolean }
  | { type: 'diagnostics/replaced'; diagnostics: Diagnostic[] }
  | { type: 'editor/saved' }
