import {
  OrganizationUnit,
  isOrganizationUnit,
  isResearchUnit,
} from '@/types/OrganizationUnit'
import { describe, expect, it } from '@jest/globals'
import { Literal } from '@/types/Literal'
import {
  OrganizationCategory,
  OrganizationGenericType,
  OrganizationIdentifierType,
} from '@prisma/client'
import { OrganizationUnitWithRelations } from '@/prisma-schema/extended-client'

describe('OrganizationUnit', () => {
  it('should create a valid OrganizationUnit object', () => {
    const validOrganizationUnit = new OrganizationUnit(
      'RS123',
      'ABC',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      'UMR',
      [
        { type: OrganizationIdentifierType.nns, value: '12345' },
        { type: OrganizationIdentifierType.ror, value: '67890' },
      ],
    )

    // Validate the object properties
    expect(validOrganizationUnit).toBeInstanceOf(OrganizationUnit)
    expect(validOrganizationUnit.uid).toBe('RS123')
    expect(validOrganizationUnit.acronym).toBe('ABC')
    expect(validOrganizationUnit.category).toBe(
      OrganizationCategory.research_unit,
    )
    expect(validOrganizationUnit.genericType).toBe(OrganizationGenericType.unit)
    expect(validOrganizationUnit.nationalType).toBe('UMR')
    expect(validOrganizationUnit.names).toEqual([
      {
        value: 'Valid Research Unit',
        language: 'en',
      },
    ])
    expect(validOrganizationUnit.descriptions).toEqual([
      {
        value: 'Valid Description',
        language: 'en',
      },
    ])
    expect(validOrganizationUnit.identifiers).toEqual([
      { type: OrganizationIdentifierType.nns, value: '12345' },
      { type: OrganizationIdentifierType.ror, value: '67890' },
    ])
  })

  it('should throw an error for invalid identifier types', () => {
    // Attempt to create an OrganizationUnit with an invalid identifier type
    expect(() => {
      new OrganizationUnit(
        'RS456',
        'DEF',
        [new Literal('Invalid Research Unit', 'en')],
        [new Literal('Invalid Description', 'en')],
        OrganizationCategory.research_unit,
        OrganizationGenericType.unit,
        null,
        [
          {
            type: 'INVALID_TYPE' as OrganizationIdentifierType,
            value: '00000',
          },
        ],
      )
    }).toThrowError(/INVALID_TYPE is not a valid OrganizationIdentifierType/)
  })

  it('should map categories to perspective groups through the type getter', () => {
    const makeUnit = (category: OrganizationCategory) =>
      new OrganizationUnit(
        'ORG1',
        null,
        [new Literal('Some Organization', 'en')],
        [],
        category,
        OrganizationGenericType.unit,
      )

    expect(makeUnit(OrganizationCategory.institution).type).toBe('institution')
    expect(makeUnit(OrganizationCategory.research_unit).type).toBe(
      'research_unit',
    )
    expect(makeUnit(OrganizationCategory.team).type).toBe('team')
    expect(makeUnit(OrganizationCategory.support_unit).type).toBe(
      'other_structure',
    )
    expect(makeUnit(OrganizationCategory.administrative_unit).type).toBe(
      'other_structure',
    )
    expect(makeUnit(OrganizationCategory.teaching_unit).type).toBe(
      'other_structure',
    )
    expect(makeUnit(OrganizationCategory.institution_subdivision).type).toBe(
      'other_structure',
    )
    expect(makeUnit(OrganizationCategory.unit_subdivision).type).toBe(
      'other_structure',
    )
  })

  it('getDisplayType should prefer local types, then national type', () => {
    const unitWithLocalTypes = new OrganizationUnit(
      'ORG2',
      null,
      [new Literal('Some Organization', 'en')],
      [],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      'UMR',
      [],
      null,
      false,
      [new Literal('Unité mixte', 'fr'), new Literal('Joint unit', 'en')],
    )

    expect(unitWithLocalTypes.getDisplayType('fr')).toBe('Unité mixte')
    expect(unitWithLocalTypes.getDisplayType('en')).toBe('Joint unit')
    // no matching language: falls back to the first local type
    expect(unitWithLocalTypes.getDisplayType('de')).toBe('Unité mixte')

    const unitWithNationalTypeOnly = new OrganizationUnit(
      'ORG3',
      null,
      [new Literal('Some Organization', 'en')],
      [],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      'UMR',
    )
    expect(unitWithNationalTypeOnly.getDisplayType('fr')).toBe('UMR')

    const unitWithoutTypes = new OrganizationUnit(
      'ORG4',
      null,
      [new Literal('Some Organization', 'en')],
      [],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
    )
    expect(unitWithoutTypes.getDisplayType('fr')).toBeNull()
  })

  it('should create an OrganizationUnit object from a db OrganizationUnitWithRelations object', () => {
    const dbOrganizationUnit: OrganizationUnitWithRelations = {
      id: 1,
      uid: 'RS123',
      acronym: 'ABC',
      genericType: OrganizationGenericType.unit,
      category: OrganizationCategory.research_unit,
      nationalType: 'UMR',
      external: false,
      hidden: false,
      hiddenEffective: false,
      slug: 'abc',
      localTypes: [{ value: 'Unité mixte', language: 'fr' }],
      labels: [
        {
          value: 'Research Unit',
          language: 'en',
          kind: 'long',
          id: 1,
          organizationUnitId: 1,
        },
        {
          value: 'Unité de Recherche',
          language: 'fr',
          kind: 'long',
          id: 2,
          organizationUnitId: 1,
        },
        {
          value: 'RU',
          language: 'en',
          kind: 'short',
          id: 3,
          organizationUnitId: 1,
        },
      ],
      descriptions: [
        {
          value: 'Description in English',
          language: 'en',
          id: 3,
          organizationUnitId: 1,
        },
        {
          value: 'Description en Français',
          language: 'fr',
          id: 4,
          organizationUnitId: 1,
        },
      ],
      identifiers: [
        {
          id: 1,
          type: OrganizationIdentifierType.nns,
          value: '12345',
          organizationUnitId: 1,
        },
        {
          id: 2,
          type: OrganizationIdentifierType.ror,
          value: '67890',
          organizationUnitId: 1,
        },
      ],
    }

    const result = OrganizationUnit.fromDbOrganizationUnit(dbOrganizationUnit)

    expect(result).toBeInstanceOf(OrganizationUnit)
    expect(result.uid).toBe('RS123')
    expect(result.acronym).toBe('ABC')
    expect(result.category).toBe(OrganizationCategory.research_unit)
    expect(result.genericType).toBe(OrganizationGenericType.unit)
    expect(result.nationalType).toBe('UMR')
    expect(result.slug).toBe('abc')
    expect(result.external).toBe(false)
    // only long labels become names
    expect(result.names).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Research Unit',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Unité de Recherche',
          language: 'fr',
        }),
      ]),
    )
    expect(result.names).toHaveLength(2)
    expect(result.localTypes).toEqual([
      expect.objectContaining({ value: 'Unité mixte', language: 'fr' }),
    ])
    expect(result.descriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Description in English',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Description en Français',
          language: 'fr',
        }),
      ]),
    )
    expect(result.identifiers).toEqual([
      {
        id: 1,
        type: OrganizationIdentifierType.nns,
        value: '12345',
        organizationUnitId: 1,
      },
      {
        id: 2,
        type: OrganizationIdentifierType.ror,
        value: '67890',
        organizationUnitId: 1,
      },
    ])
  })

  it('should handle an empty identifiers array if not provided', () => {
    const dbOrganizationUnit: OrganizationUnitWithRelations = {
      id: 2,
      uid: 'RS456',
      acronym: null,
      genericType: OrganizationGenericType.unit,
      category: OrganizationCategory.research_unit,
      nationalType: null,
      external: false,
      hidden: false,
      hiddenEffective: false,
      slug: 'another-research-unit',
      localTypes: null,
      labels: [
        {
          value: 'Another Research Unit',
          language: 'en',
          kind: 'long',
          id: 5,
          organizationUnitId: 2,
        },
      ],
      descriptions: [
        {
          value: 'Another description',
          language: 'en',
          id: 6,
          organizationUnitId: 2,
        },
      ],
      identifiers: [],
    }

    const result = OrganizationUnit.fromDbOrganizationUnit(dbOrganizationUnit)

    expect(result).toBeInstanceOf(OrganizationUnit)
    expect(result.uid).toBe('RS456')
    expect(result.acronym).toBeNull()
    expect(result.nationalType).toBeNull()
    expect(result.localTypes).toEqual([])
    expect(result.names).toEqual([
      { value: 'Another Research Unit', language: 'en' },
    ])
    expect(result.descriptions).toEqual([
      { value: 'Another description', language: 'en' },
    ])
    expect(result.identifiers).toEqual([])
  })

  it('hasIdHAL test', () => {
    const organizationUnitWithIdHal = new OrganizationUnit(
      'RS123',
      'ABC',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      null,
      [
        { type: OrganizationIdentifierType.hal, value: '12345' },
        { type: OrganizationIdentifierType.ror, value: '67890' },
      ],
    )

    expect(organizationUnitWithIdHal.hasIdHAL()).toBe(true)

    const organizationUnitWithoutIdHal = new OrganizationUnit(
      'RS123',
      'ABC',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      null,
      [
        { type: OrganizationIdentifierType.nns, value: '12345' },
        { type: OrganizationIdentifierType.ror, value: '67890' },
      ],
    )

    expect(organizationUnitWithoutIdHal.hasIdHAL()).toBe(false)
  })

  it('isOrganizationUnit and isResearchUnit type guards', () => {
    const researchUnit = new OrganizationUnit(
      'RS1',
      null,
      [new Literal('Unit', 'en')],
      [],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
    )
    const institution = new OrganizationUnit(
      'INST1',
      null,
      [new Literal('Institution', 'en')],
      [],
      OrganizationCategory.institution,
      OrganizationGenericType.institution,
    )
    const supportUnit = new OrganizationUnit(
      'SUP1',
      null,
      [new Literal('Support', 'en')],
      [],
      OrganizationCategory.support_unit,
      OrganizationGenericType.unit,
    )

    expect(isOrganizationUnit(researchUnit)).toBe(true)
    expect(isOrganizationUnit(institution)).toBe(true)
    expect(isOrganizationUnit(supportUnit)).toBe(true)
    expect(isOrganizationUnit(null)).toBe(false)
    expect(isOrganizationUnit(undefined)).toBe(false)

    expect(isResearchUnit(researchUnit)).toBe(true)
    expect(isResearchUnit(institution)).toBe(false)
    expect(isResearchUnit(supportUnit)).toBe(false)
    expect(isResearchUnit(null)).toBe(false)
  })
})
