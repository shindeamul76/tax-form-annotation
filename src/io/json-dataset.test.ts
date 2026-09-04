import { describe, expect, it } from 'vitest'
import { JsonDatasetError, parseJsonDataset } from './json-dataset'

describe('parseJsonDataset', () => {
  it('parses nested JSON data', () => {
    expect(
      parseJsonDataset('{"returns":{"federal":{"2025":{"wages":60000}}}}'),
    ).toEqual({ returns: { federal: { '2025': { wages: 60_000 } } } })
  })

  it('reports malformed JSON without exposing parser details', () => {
    expect(() => parseJsonDataset('{invalid')).toThrow(
      new JsonDatasetError('The selected file does not contain valid JSON.'),
    )
  })

  it('rejects numbers that parse outside the finite JavaScript range', () => {
    expect(() => parseJsonDataset('{"amount":1e400}')).toThrow(
      'The dataset contains a number that cannot be represented safely.',
    )
  })
})
