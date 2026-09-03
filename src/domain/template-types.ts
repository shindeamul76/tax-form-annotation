export interface LoadedTemplateMetadata {
  fileName: string
  sha256: string
  pages: LoadedTemplatePageMetadata[]
}

export interface LoadedTemplatePageMetadata {
  pageNumber: number
  widthPt: number
  heightPt: number
  rotationDegrees: number
}
