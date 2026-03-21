import { ResearchUnit } from '@/types/ResearchUnit'
import { describe, expect, it } from '@jest/globals'
import { Literal } from '@/types/Literal'
import { ResearchUnitIdentifierType } from '@prisma/client'

describe('ResearchUnit', () => {
  it('should create a valid ResearchUnit object', () => {
    const validResearchUnit = new ResearchUnit(
      'RS123',
      'ABC',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      'ABC_signature',
      [
        { type: ResearchUnitIdentifierType.nns, value: '12345' },
        { type: ResearchUnitIdentifierType.ror, value: '67890' },
      ],
    )

    // Validate the object properties
    expect(validResearchUnit).toBeInstanceOf(ResearchUnit)
    expect(validResearchUnit.uid).toBe('RS123')
    expect(validResearchUnit.acronym).toBe('ABC')
    expect(validResearchUnit.signature).toBe('ABC_signature')
    expect(validResearchUnit.names).toEqual([
      {
        value: 'Valid Research Unit',
        language: 'en',
      },
    ])
    expect(validResearchUnit.descriptions).toEqual([
      {
        value: 'Valid Description',
        language: 'en',
      },
    ])
    expect(validResearchUnit.identifiers).toEqual([
      { type: ResearchUnitIdentifierType.nns, value: '12345' },
      { type: ResearchUnitIdentifierType.ror, value: '67890' },
    ])
  })

  it('should throw an error for invalid identifier types', () => {
    // Attempt to create a ResearchUnit with an invalid identifier type
    expect(() => {
      new ResearchUnit(
        'RS456',
        'DEF',
        [new Literal('Invalid Research Unit', 'en')],
        [new Literal('Invalid Description', 'en')],
        'DEF_signature',
        [
          {
            type: 'INVALID_TYPE' as ResearchUnitIdentifierType,
            value: '00000',
          },
        ],
      )
    }).toThrowError(/INVALID_TYPE is not a valid ResearchUnitIdentifierType/)
  })

  it('should create a ResearchUnit object from a DbResearchUnit object', () => {
    // Mock DbResearchUnit input
    const dbResearchUnit = {
      id: 1,
      uid: 'RS123',
      acronym: 'ABC',
      signature: 'ABC_signature',
      slug: 'abc',
      external: false,
      names: [
        {
          value: 'Research Unit',
          language: 'en',
          id: 1,
          researchUnitId: 1,
        },
        {
          value: 'Unité de Recherche',
          language: 'fr',
          id: 2,
          researchUnitId: 1,
        },
      ],
      descriptions: [
        {
          value: 'Description in English',
          language: 'en',
          id: 3,
          researchUnitId: 1,
        },
        {
          value: 'Description en Français',
          language: 'fr',
          id: 4,
          researchUnitId: 1,
        },
      ],
      identifiers: [
        {
          id: 1,
          type: ResearchUnitIdentifierType.nns,
          value: '12345',
          researchUnitId: 1,
        },
        {
          id: 1,
          type: ResearchUnitIdentifierType.ror,
          value: '67890',
          researchUnitId: 1,
        },
      ],
    }

    const result = ResearchUnit.fromDbResearchUnit(dbResearchUnit)

    expect(result).toBeInstanceOf(ResearchUnit)
    expect(result.uid).toBe('RS123')
    expect(result.acronym).toBe('ABC')
    expect(result.signature).toBe('ABC_signature')
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
        type: ResearchUnitIdentifierType.nns,
        value: '12345',
        researchUnitId: 1,
      },
      {
        id: 1,
        type: ResearchUnitIdentifierType.ror,
        value: '67890',
        researchUnitId: 1,
      },
    ])
  })

  it('should handle an empty identifiers array if not provided', () => {
    // Mock DbResearchUnit input without identifiers
    const dbResearchUnit = {
      id: 2,
      uid: 'RS456',
      acronym: null,
      signature: null,
      slug: 'another-research-unit',
      external: false,
      names: [
        {
          value: 'Another Research Unit',
          language: 'en',
          id: 5,
          researchUnitId: 2,
        },
      ],
      descriptions: [
        {
          value: 'Another description',
          language: 'en',
          id: 6,
          researchUnitId: 2,
        },
      ],
      identifiers: [],
    }

    const result = ResearchUnit.fromDbResearchUnit(dbResearchUnit)

    expect(result).toBeInstanceOf(ResearchUnit)
    expect(result.uid).toBe('RS456')
    expect(result.acronym).toBeNull()
    expect(result.signature).toBeNull()
    expect(result.names).toEqual([
      { value: 'Another Research Unit', language: 'en' },
    ])
    expect(result.descriptions).toEqual([
      { value: 'Another description', language: 'en' },
    ])
    expect(result.identifiers).toEqual([])
  })

  it('hasIdHAL test', () => {
    const researchUnitWithIdHal = new ResearchUnit(
      'RS123',
      'ABC',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      'ABC_signature',
      [
        { type: ResearchUnitIdentifierType.hal, value: '12345' },
        { type: ResearchUnitIdentifierType.ror, value: '67890' },
      ],
    )

    expect(researchUnitWithIdHal.hasIdHAL()).toBe(true)

    const researchUnitWithoutIdHal = new ResearchUnit(
      'RS123',
      'ABC',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      'ABC_signature',
      [
        { type: ResearchUnitIdentifierType.nns, value: '12345' },
        { type: ResearchUnitIdentifierType.ror, value: '67890' },
      ],
    )

    expect(researchUnitWithoutIdHal.hasIdHAL()).toBe(false)
  })
})
