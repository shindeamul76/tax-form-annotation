import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnnotationReadinessResult } from '../../app/evaluate-annotation-readiness'
import { ValidationPanel } from './ValidationPanel'

const blockedResult: AnnotationReadinessResult = {
  candidate: null,
  isExportReady: false,
  stages: [
    { id: 'draft', label: 'Draft completeness', status: 'failed' },
    { id: 'schema', label: 'JSON Schema', status: 'not-run' },
    { id: 'semantics', label: 'Semantic checks', status: 'not-run' },
  ],
  diagnostics: [
    {
      severity: 'error',
      code: 'DRAFT_FIELD_UNMAPPED',
      message: 'Map field "Wages" before export.',
      draftId: 'acroform:wages',
      page: 1,
      path: '/fields/0',
    },
  ],
}

describe('ValidationPanel', () => {
  it('shows validation stages and navigates to an actionable field issue', () => {
    const onDiagnosticSelected = vi.fn()
    render(
      <ValidationPanel
        result={blockedResult}
        onDiagnosticSelected={onDiagnosticSelected}
        onExport={vi.fn()}
      />,
    )

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByLabelText('Validation stages')).toHaveTextContent(
      'Draft completenessFailed',
    )
    expect(screen.getByText('1 errors')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Download annotation JSON' }),
    ).toBeDisabled()

    fireEvent.click(
      screen.getByRole('button', {
        name: /Map field "Wages" before export/,
      }),
    )
    expect(onDiagnosticSelected).toHaveBeenCalledWith(
      blockedResult.diagnostics[0],
    )
  })

  it('shows when every export gate has passed', () => {
    const onExport = vi.fn()
    render(
      <ValidationPanel
        result={{
          ...blockedResult,
          candidate: {} as AnnotationReadinessResult['candidate'],
          isExportReady: true,
          diagnostics: [],
          stages: blockedResult.stages.map((stage) => ({
            ...stage,
            status: 'passed',
          })),
        }}
        onDiagnosticSelected={vi.fn()}
        onExport={onExport}
      />,
    )

    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(
      screen.getByText('The annotation can be serialized and exported.'),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Download annotation JSON' }),
    )
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('keeps non-blocking warnings visible when export is ready', () => {
    render(
      <ValidationPanel
        result={{
          ...blockedResult,
          isExportReady: true,
          diagnostics: [
            {
              severity: 'warning',
              code: 'FIELD_POINTER_MISSING',
              message: 'The sample path does not exist.',
              path: '/fields/0/source/pointer',
            },
          ],
          stages: blockedResult.stages.map((stage) => ({
            ...stage,
            status: 'passed',
          })),
        }}
        onDiagnosticSelected={vi.fn()}
        onExport={vi.fn()}
      />,
    )

    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('1 warnings')).toBeInTheDocument()
    expect(screen.getByLabelText('Export issues')).toHaveTextContent(
      'The sample path does not exist.',
    )
  })
})
