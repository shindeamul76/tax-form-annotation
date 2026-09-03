export type DiagnosticSeverity = 'info' | 'warning' | 'error'

export interface Diagnostic {
  severity: DiagnosticSeverity
  code: string
  message: string
  fieldId?: string
  draftId?: string
  page?: number
  path?: string
}
