import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DraftFormMetadata } from '../../domain/annotation-draft'
import type { DataContract } from '../../domain/annotation-types'
import { FormMetadataEditor } from './FormMetadataEditor'

const completeForm: DraftFormMetadata = {
  formId: 'IRS-1040',
  title: 'U.S. Individual Income Tax Return',
  taxYear: 2025,
  revision: '2025-final',
  templateFile: 'f1040-2025.pdf',
  pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
}

const completeDataContract: DataContract = {
  id: 'com.tax-form-annotator.taxpayer-return',
  version: '1.0',
}

describe('FormMetadataEditor', () => {
  it('identifies every missing form value without changing PDF-derived metadata', () => {
    renderEditor({ form: { pages: completeForm.pages } })

    expect(screen.getByText('Incomplete')).toBeInTheDocument()
    expect(screen.getByLabelText('Form ID')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Tax year')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Form title')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Revision')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Metadata issues')).toHaveTextContent(
      'Enter a form ID',
    )
  })

  it('reports complete metadata when every editable value is valid', () => {
    renderEditor()

    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(
      screen.getByText('Metadata is ready for annotation validation.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Metadata issues')).not.toBeInTheDocument()
  })

  it('emits controlled form and data-contract edits', () => {
    const onFormChanged = vi.fn()
    const onDataContractChanged = vi.fn()
    renderEditor({ onFormChanged, onDataContractChanged })

    fireEvent.change(screen.getByLabelText('Form ID'), {
      target: { value: 'IRS-1040-SR' },
    })
    fireEvent.change(screen.getByLabelText('Tax year'), {
      target: { value: '2026' },
    })
    fireEvent.change(screen.getByLabelText('Contract ID'), {
      target: { value: 'com.example.return' },
    })
    fireEvent.change(screen.getByLabelText('Version'), {
      target: { value: '2.0' },
    })

    expect(onFormChanged).toHaveBeenCalledWith({ formId: 'IRS-1040-SR' })
    expect(onFormChanged).toHaveBeenCalledWith({ taxYear: 2026 })
    expect(onDataContractChanged).toHaveBeenCalledWith({
      ...completeDataContract,
      id: 'com.example.return',
    })
    expect(onDataContractChanged).toHaveBeenCalledWith({
      ...completeDataContract,
      version: '2.0',
    })
  })
})

interface EditorOverrides {
  form?: DraftFormMetadata
  dataContract?: DataContract
  onFormChanged?: Parameters<typeof FormMetadataEditor>[0]['onFormChanged']
  onDataContractChanged?: Parameters<
    typeof FormMetadataEditor
  >[0]['onDataContractChanged']
}

function renderEditor(overrides: EditorOverrides = {}) {
  return render(
    <FormMetadataEditor
      form={overrides.form ?? completeForm}
      dataContract={overrides.dataContract ?? completeDataContract}
      onFormChanged={overrides.onFormChanged ?? vi.fn()}
      onDataContractChanged={overrides.onDataContractChanged ?? vi.fn()}
    />,
  )
}
