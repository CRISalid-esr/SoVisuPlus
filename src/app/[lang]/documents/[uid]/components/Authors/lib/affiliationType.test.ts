import { AuthorityOrganizationType } from '@prisma/client'
import { dbTypeToHal, normalizeHalType } from './affiliationType'

describe('dbTypeToHal', () => {
  it('maps every DB type with a HAL equivalent', () => {
    expect(dbTypeToHal(AuthorityOrganizationType.institution)).toBe(
      'institution',
    )
    expect(dbTypeToHal(AuthorityOrganizationType.laboratory)).toBe('laboratory')
    expect(dbTypeToHal(AuthorityOrganizationType.research_team)).toBe(
      'researchteam',
    )
    expect(dbTypeToHal(AuthorityOrganizationType.institution_group)).toBe(
      'institution',
    )
    expect(dbTypeToHal(AuthorityOrganizationType.laboratory_group)).toBe(
      'regrouplaboratory',
    )
    expect(dbTypeToHal(AuthorityOrganizationType.research_team_group)).toBe(
      'researchteam',
    )
  })

  it('returns null for DB types without a HAL default', () => {
    expect(dbTypeToHal(AuthorityOrganizationType.organization)).toBeNull()
  })

  it('returns null for a null type', () => {
    expect(dbTypeToHal(null)).toBeNull()
  })
})

describe('normalizeHalType', () => {
  it('accepts the five supported HAL values (case/space-insensitive)', () => {
    expect(normalizeHalType('institution')).toBe('institution')
    expect(normalizeHalType('department')).toBe('department')
    expect(normalizeHalType('regrouplaboratory')).toBe('regrouplaboratory')
    expect(normalizeHalType('laboratory')).toBe('laboratory')
    expect(normalizeHalType('  ResearchTeam ')).toBe('researchteam')
  })

  it('returns null for unknown / empty / nullish values', () => {
    expect(normalizeHalType('regroupinstitution')).toBeNull()
    expect(normalizeHalType('')).toBeNull()
    expect(normalizeHalType(null)).toBeNull()
    expect(normalizeHalType(undefined)).toBeNull()
  })
})
