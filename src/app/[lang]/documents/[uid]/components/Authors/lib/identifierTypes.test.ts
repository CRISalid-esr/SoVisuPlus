import {
  normalizeIdentifierType,
  toWorkingIdentifiers,
} from './identifierTypes'

describe('normalizeIdentifierType', () => {
  it('accepts known types', () => {
    expect(normalizeIdentifierType('orcid')).toBe('orcid')
    expect(normalizeIdentifierType('idhals')).toBe('idhals')
    expect(normalizeIdentifierType('idhali')).toBe('idhali')
  })

  it('trims and lower-cases', () => {
    expect(normalizeIdentifierType('  ORCID ')).toBe('orcid')
  })

  it('returns null for unknown types', () => {
    expect(normalizeIdentifierType('form_i')).toBeNull()
    expect(normalizeIdentifierType('')).toBeNull()
  })
})

describe('toWorkingIdentifiers', () => {
  it('keeps known types (normalised) and drops unknown ones', () => {
    expect(
      toWorkingIdentifiers([
        { type: 'ORCID', value: '0000-0001' },
        { type: 'form_i', value: '42' },
        { type: 'idref', value: '123' },
      ]),
    ).toEqual([
      { type: 'orcid', value: '0000-0001' },
      { type: 'idref', value: '123' },
    ])
  })
})
