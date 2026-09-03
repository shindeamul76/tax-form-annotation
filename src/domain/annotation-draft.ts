import type {
  AnnotationDefaults,
  AnnotationVersion,
  CoordinateSystem,
  DataContract,
  FieldBehavior,
  FieldFormat,
  FieldStyle,
  NormalizedBox,
  PageMetadata,
  ValueSource,
} from './annotation-types'

export type DraftFieldOrigin = 'acroform' | 'manual' | 'imported-json'

export type DraftMappingStatus = 'unmapped' | 'mapped' | 'invalid'

export type DraftSourceFieldKind =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'choice'
  | 'signature'
  | 'button'
  | 'unknown'

export interface DraftFormMetadata {
  formId?: string
  title?: string
  taxYear?: number
  revision?: string
  templateFile?: string
  templateSha256?: string
  pages: PageMetadata[]
}

export interface DraftFieldAnnotation {
  draftId: string
  origin: DraftFieldOrigin
  originalPdfFieldName?: string
  sourceFieldKind?: DraftSourceFieldKind
  mappingStatus: DraftMappingStatus
  id?: string
  label?: string
  description?: string
  page: number
  source?: ValueSource
  box: NormalizedBox
  format?: FieldFormat
  style?: Partial<FieldStyle>
  behavior?: Partial<FieldBehavior>
}

export interface AnnotationDraft {
  annotationVersion: AnnotationVersion
  form: DraftFormMetadata
  dataContract: DataContract
  coordinateSystem: CoordinateSystem
  defaults: AnnotationDefaults
  fields: DraftFieldAnnotation[]
}
