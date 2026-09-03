import type { JsonObject, JsonValue } from './annotation-types'

export type JsonPointerResolution =
  | JsonPointerFound
  | JsonPointerMissing
  | JsonPointerInvalid

export interface JsonPointerFound {
  status: 'found'
  pointer: string
  value: JsonValue
}

export interface JsonPointerMissing {
  status: 'missing'
  pointer: string
  reason: JsonPointerMissingReason
  failedToken: string
  tokenIndex: number
}

export type JsonPointerMissingReason =
  | 'property-not-found'
  | 'invalid-array-index'
  | 'array-index-not-found'
  | 'value-not-container'

export interface JsonPointerInvalid {
  status: 'invalid'
  pointer: string
  reason: JsonPointerInvalidReason
  failedToken?: string
  tokenIndex?: number
}

export type JsonPointerInvalidReason =
  | 'must-start-with-slash'
  | 'invalid-escape-sequence'

interface ParsedJsonPointer {
  status: 'parsed'
  tokens: string[]
}

type JsonPointerParseResult = ParsedJsonPointer | JsonPointerInvalid

const arrayIndexPattern = /^(?:0|[1-9][0-9]*)$/u
const invalidEscapePattern = /~(?:[^01]|$)/u

export function resolveJsonPointer(
  rootValue: JsonValue,
  pointer: string,
): JsonPointerResolution {
  const parseResult = parseJsonPointer(pointer)

  if (parseResult.status === 'invalid') {
    return parseResult
  }

  let currentValue = rootValue

  for (const [tokenIndex, token] of parseResult.tokens.entries()) {
    if (Array.isArray(currentValue)) {
      const arrayIndex = parseArrayIndex(token)

      if (arrayIndex === null) {
        return createMissingResult(pointer, 'invalid-array-index', token, tokenIndex)
      }

      if (arrayIndex >= currentValue.length || !Object.hasOwn(currentValue, arrayIndex)) {
        return createMissingResult(pointer, 'array-index-not-found', token, tokenIndex)
      }

      currentValue = currentValue[arrayIndex]
      continue
    }

    if (isJsonObject(currentValue)) {
      if (!Object.hasOwn(currentValue, token)) {
        return createMissingResult(pointer, 'property-not-found', token, tokenIndex)
      }

      currentValue = currentValue[token]
      continue
    }

    return createMissingResult(pointer, 'value-not-container', token, tokenIndex)
  }

  return {
    status: 'found',
    pointer,
    value: currentValue,
  }
}

function parseJsonPointer(pointer: string): JsonPointerParseResult {
  if (pointer === '') {
    return { status: 'parsed', tokens: [] }
  }

  if (!pointer.startsWith('/')) {
    return {
      status: 'invalid',
      pointer,
      reason: 'must-start-with-slash',
    }
  }

  const encodedTokens = pointer.slice(1).split('/')
  const decodedTokens: string[] = []

  for (const [tokenIndex, encodedToken] of encodedTokens.entries()) {
    if (invalidEscapePattern.test(encodedToken)) {
      return {
        status: 'invalid',
        pointer,
        reason: 'invalid-escape-sequence',
        failedToken: encodedToken,
        tokenIndex,
      }
    }

    decodedTokens.push(decodeReferenceToken(encodedToken))
  }

  return { status: 'parsed', tokens: decodedTokens }
}

function decodeReferenceToken(encodedToken: string): string {
  // RFC 6901 requires this order so `~01` becomes `~1`, not `/`.
  return encodedToken.replaceAll('~1', '/').replaceAll('~0', '~')
}

function parseArrayIndex(token: string): number | null {
  if (!arrayIndexPattern.test(token)) {
    return null
  }

  const arrayIndex = Number(token)
  return Number.isSafeInteger(arrayIndex) ? arrayIndex : null
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createMissingResult(
  pointer: string,
  reason: JsonPointerMissingReason,
  failedToken: string,
  tokenIndex: number,
): JsonPointerMissing {
  return {
    status: 'missing',
    pointer,
    reason,
    failedToken,
    tokenIndex,
  }
}
