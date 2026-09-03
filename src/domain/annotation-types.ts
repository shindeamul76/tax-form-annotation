export type JsonPrimitive = string | number | boolean | null

export type JsonArray = JsonValue[]

export interface JsonObject {
  [propertyName: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonArray | JsonObject

export type AnnotationVersion = '1.0'

export interface AnnotationDocument {
  annotationVersion: AnnotationVersion
  form: FormMetadata
  dataContract: DataContract
  coordinateSystem: CoordinateSystem
  defaults: AnnotationDefaults
  fields: FieldAnnotation[]
}

export interface FormMetadata {
  formId: string
  title: string
  taxYear: number
  revision: string
  templateFile: string
  templateSha256?: string
  pages: PageMetadata[]
}

export interface PageMetadata {
  pageNumber: number
  widthPt: number
  heightPt: number
}

export interface DataContract {
  id: string
  version: string
}

export interface CoordinateSystem {
  unit: 'normalized'
  origin: 'top-left'
  pageNumbering: 'one-based'
}

export interface AnnotationDefaults {
  style: FieldStyle
  behavior: FieldBehavior
}

export interface FieldAnnotation {
  id: string
  label: string
  description?: string
  page: number
  source: ValueSource
  box: NormalizedBox
  format: FieldFormat
  style?: FieldStyleOverride
  behavior?: FieldBehaviorOverride
}

export interface NormalizedBox {
  x: number
  y: number
  width: number
  height: number
}

export type ValueSource = JsonPointerSource | ConstantSource

export interface JsonPointerSource {
  kind: 'json-pointer'
  pointer: string
}

export interface ConstantSource {
  kind: 'constant'
  value: JsonPrimitive
}

export type FieldFormat =
  | TextFormat
  | NumberFormat
  | MoneyFormat
  | DateFormat
  | CheckboxFormat
  | PercentageFormat
  | MaskedIdentifierFormat
  | MultilineTextFormat

export interface TextFormat {
  type: 'text'
  trim: boolean
  case: TextCase
  prefix?: string
  suffix?: string
}

export type TextCase = 'preserve' | 'uppercase' | 'lowercase' | 'title-case'

export interface NumberFormat {
  type: 'number'
  decimalPlaces: number
  useThousandsSeparator: boolean
  negativeStyle: NegativeNumberStyle
}

export interface MoneyFormat {
  type: 'money'
  decimalPlaces: number
  useThousandsSeparator: boolean
  showCurrencySymbol: boolean
  currencySymbol: string
  negativeStyle: NegativeNumberStyle
}

export type NegativeNumberStyle = 'minus' | 'parentheses'

export interface DateFormat {
  type: 'date'
  inputPattern: 'YYYY-MM-DD'
  outputPattern: DateOutputPattern
}

export type DateOutputPattern =
  | 'MM/DD/YYYY'
  | 'MM-DD-YYYY'
  | 'YYYY-MM-DD'
  | 'MMDDYYYY'

export interface CheckboxFormat {
  type: 'checkbox'
  trueMark: string
  falseMark: string
}

export interface PercentageFormat {
  type: 'percentage'
  inputScale: PercentageInputScale
  decimalPlaces: number
  showPercentSymbol: boolean
}

export type PercentageInputScale = 'fraction' | 'percent'

export interface MaskedIdentifierFormat {
  type: 'masked-identifier'
  mask: string
  placeholder: string
}

export interface MultilineTextFormat {
  type: 'multiline-text'
  preserveNewlines: boolean
  maximumLines: number
}

export interface FieldStyle {
  fontFamily: string
  fontSizePt: number
  minimumFontSizePt: number
  horizontalAlign: HorizontalAlignment
  verticalAlign: VerticalAlignment
  paddingPt: number
  color: string
  overflow: OverflowBehavior
  rotationDegrees: number
  lineHeight: number
}

export type HorizontalAlignment = 'left' | 'center' | 'right'

export type VerticalAlignment = 'top' | 'middle' | 'bottom'

export type OverflowBehavior = 'shrink' | 'clip' | 'wrap' | 'error'

export interface FieldBehavior {
  onMissing: MissingValueBehavior
  onNull: MissingValueBehavior
  printZero: boolean
}

export type MissingValueBehavior = 'blank' | 'warn' | 'error'

type AtLeastOne<PropertyShape> = {
  [PropertyName in keyof PropertyShape]: Required<
    Pick<PropertyShape, PropertyName>
  > &
    Partial<Omit<PropertyShape, PropertyName>>
}[keyof PropertyShape]

export type FieldStyleOverride = AtLeastOne<FieldStyle>

export type FieldBehaviorOverride = AtLeastOne<FieldBehavior>
