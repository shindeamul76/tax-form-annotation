import { describe, expect, it } from 'vitest'
import type { JsonValue } from './annotation-types'
import { resolveJsonPointer } from './json-pointer'

describe('resolveJsonPointer', () => {
  const taxpayerReturn: JsonValue = {
    returns: {
      federal: {
        '2025': {
          income: {
            wages: 60_000,
          },
          dependents: [
            {
              name: {
                first: 'Taylor',
              },
            },
          ],
        },
      },
    },
  }

  it('resolves a deeply nested object value', () => {
    expect(
      resolveJsonPointer(taxpayerReturn, '/returns/federal/2025/income/wages'),
    ).toEqual({
      status: 'found',
      pointer: '/returns/federal/2025/income/wages',
      value: 60_000,
    })
  })

  it('resolves a zero-based array index', () => {
    expect(
      resolveJsonPointer(
        taxpayerReturn,
        '/returns/federal/2025/dependents/0/name/first',
      ),
    ).toMatchObject({
      status: 'found',
      value: 'Taylor',
    })
  })

  it('returns the complete document for the RFC 6901 root pointer', () => {
    expect(resolveJsonPointer(taxpayerReturn, '')).toEqual({
      status: 'found',
      pointer: '',
      value: taxpayerReturn,
    })
  })

  it.each([
    ['/nullValue', null],
    ['/zeroValue', 0],
    ['/falseValue', false],
    ['/emptyValue', ''],
  ] as const)('preserves the JSON value at %s', (pointer, expectedValue) => {
    const values: JsonValue = {
      nullValue: null,
      zeroValue: 0,
      falseValue: false,
      emptyValue: '',
    }

    expect(resolveJsonPointer(values, pointer)).toMatchObject({
      status: 'found',
      value: expectedValue,
    })
  })

  it('decodes escaped property-name characters in the required order', () => {
    const values: JsonValue = {
      'a/b': 'slash',
      'm~n': 'tilde',
      '~1': 'ordered',
    }

    expect(resolveJsonPointer(values, '/a~1b')).toMatchObject({
      status: 'found',
      value: 'slash',
    })
    expect(resolveJsonPointer(values, '/m~0n')).toMatchObject({
      status: 'found',
      value: 'tilde',
    })
    expect(resolveJsonPointer(values, '/~01')).toMatchObject({
      status: 'found',
      value: 'ordered',
    })
  })

  it('does not traverse inherited object properties', () => {
    expect(resolveJsonPointer({ wages: 60_000 }, '/toString')).toEqual({
      status: 'missing',
      pointer: '/toString',
      reason: 'property-not-found',
      failedToken: 'toString',
      tokenIndex: 0,
    })
  })

  it('reports the segment where an object property is missing', () => {
    expect(resolveJsonPointer(taxpayerReturn, '/returns/state')).toEqual({
      status: 'missing',
      pointer: '/returns/state',
      reason: 'property-not-found',
      failedToken: 'state',
      tokenIndex: 1,
    })
  })

  it.each(['01', '-1', '1.5', '-'])('rejects the array index %s', (arrayIndex) => {
    expect(resolveJsonPointer(['first'], `/${arrayIndex}`)).toEqual({
      status: 'missing',
      pointer: `/${arrayIndex}`,
      reason: 'invalid-array-index',
      failedToken: arrayIndex,
      tokenIndex: 0,
    })
  })

  it('reports an array index that does not exist', () => {
    expect(resolveJsonPointer(['first'], '/1')).toEqual({
      status: 'missing',
      pointer: '/1',
      reason: 'array-index-not-found',
      failedToken: '1',
      tokenIndex: 0,
    })
  })

  it('reports an attempt to traverse through a primitive value', () => {
    expect(resolveJsonPointer({ income: 60_000 }, '/income/wages')).toEqual({
      status: 'missing',
      pointer: '/income/wages',
      reason: 'value-not-container',
      failedToken: 'wages',
      tokenIndex: 1,
    })
  })

  it('reports a pointer without the required leading slash', () => {
    expect(resolveJsonPointer(taxpayerReturn, 'returns/federal')).toEqual({
      status: 'invalid',
      pointer: 'returns/federal',
      reason: 'must-start-with-slash',
    })
  })

  it.each(['/invalid~2escape', '/invalid~'])(
    'reports an invalid escape sequence in %s',
    (pointer) => {
      expect(resolveJsonPointer(taxpayerReturn, pointer)).toMatchObject({
        status: 'invalid',
        pointer,
        reason: 'invalid-escape-sequence',
        tokenIndex: 0,
      })
    },
  )
})
