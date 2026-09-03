import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('offers bundled and local PDF loading options', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Map structured data to an exact tax form.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Load included Form 1040' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Upload PDF template')).toHaveAttribute(
      'accept',
      'application/pdf,.pdf',
    )
    expect(screen.getByLabelText('No template loaded')).toBeInTheDocument()
  })
})
