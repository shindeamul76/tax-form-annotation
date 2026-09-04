import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from './file-download'

describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clicks a temporary download link and releases its object URL', () => {
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:annotation-json')
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const blob = new Blob(['{}\n'], { type: 'application/json' })

    downloadBlob(blob, 'irs-1040-2025.annotation.json')

    expect(createObjectUrl).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:annotation-json')
    expect(
      document.querySelector('a[download="irs-1040-2025.annotation.json"]'),
    ).toBeNull()
  })
})
