import type { JsonValue } from '../domain/annotation-types'

export class JsonDatasetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonDatasetError'
  }
}

export function parseJsonDataset(sourceText: string): JsonValue {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(sourceText) as unknown
  } catch {
    throw new JsonDatasetError('The selected file does not contain valid JSON.')
  }

  if (!isJsonValue(parsedValue)) {
    throw new JsonDatasetError(
      'The dataset contains a number that cannot be represented safely.',
    )
  }

  return parsedValue
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  if (typeof value !== 'object') {
    return false
  }

  return Object.values(value).every(isJsonValue)
}
