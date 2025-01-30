import { ResearchStructure } from '@/types/ResearchStructure'
import { describe, expect, it } from '@jest/globals'
import { ResearchStructureIdentifierType } from '@/types/ResearchStructureIdentifier'

describe('ResearchStructure', () => {
  it('should create a valid ResearchStructure object', () => {
    const validResearchStructure = new ResearchStructure(
      'RS123',
      'ABC',
      [{ value: 'Valid Research Structure', language: 'en' }],
      [{ value: 'Valid Description', language: 'en' }],
      [
        { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
        { type: ResearchStructureIdentifierType.ROR, value: '67890' },
      ],
    )

    // Validate the object properties
    expect(validResearchStructure).toBeInstanceOf(ResearchStructure)
    expect(validResearchStructure.uid).toBe('RS123')
    expect(validResearchStructure.acronym).toBe('ABC')
    expect(validResearchStructure.names).toEqual([
      {
        value: 'Valid Research Structure',
        language: 'en',
      },
    ])
    expect(validResearchStructure.descriptions).toEqual([
      {
        value: 'Valid Description',
        language: 'en',
      },
    ])
    expect(validResearchStructure.identifiers).toEqual([
      { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
      { type: ResearchStructureIdentifierType.ROR, value: '67890' },
    ])
  })

  it('should throw an error for invalid identifier types', () => {
    // Attempt to create a ResearchStructure with an invalid identifier type
    expect(() => {
      new ResearchStructure(
        'RS456',
        'DEF',
        [{ value: 'Invalid Research Structure', language: 'en' }],
        [{ value: 'Invalid Description', language: 'en' }],
        [
          {
            type: 'INVALID_TYPE' as ResearchStructureIdentifierType,
            value: '00000',
          },
        ],
      )
    }).toThrowError(
      /INVALID_TYPE is not a valid ResearchStructureIdentifierType/,
    )
  })

  it('should create a ResearchStructure object from a DbResearchStructure object', () => {
    // Mock DbResearchStructure input
    const dbResearchStructure = {
      id: 1,
      uid: 'RS123',
      acronym: 'ABC',
      external: false,
      names: [
        {
          value: 'Research Structure',
          language: 'en',
          id: 1,
          researchStructureId: 1,
        },
        {
          value: 'Structure de Recherche',
          language: 'fr',
          id: 2,
          researchStructureId: 1,
        },
      ],
      descriptions: [
        {
          value: 'Description in English',
          language: 'en',
          id: 3,
          researchStructureId: 1,
        },
        {
          value: 'Description en Français',
          language: 'fr',
          id: 4,
          researchStructureId: 1,
        },
      ],
      identifiers: [
        { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
        { type: ResearchStructureIdentifierType.RNSR, value: '67890' },
      ],
    }

    const result =
      ResearchStructure.fromDbResearchStructure(dbResearchStructure)

    expect(result).toBeInstanceOf(ResearchStructure)
    expect(result.uid).toBe('RS123')
    expect(result.acronym).toBe('ABC')
    expect(result.names).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Research Structure',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Structure de Recherche',
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
      { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
      { type: ResearchStructureIdentifierType.RNSR, value: '67890' },
    ])
  })

  it('should handle an empty identifiers array if not provided', () => {
    // Mock DbResearchStructure input without identifiers
    const dbResearchStructure = {
      id: 2,
      uid: 'RS456',
      acronym: null,
      external: false,
      names: [
        {
          value: 'Another Research Structure',
          language: 'en',
          id: 5,
          researchStructureId: 2,
        },
      ],
      descriptions: [
        {
          value: 'Another description',
          language: 'en',
          id: 6,
          researchStructureId: 2,
        },
      ],
    }

    const result =
      ResearchStructure.fromDbResearchStructure(dbResearchStructure)

    expect(result).toBeInstanceOf(ResearchStructure)
    expect(result.uid).toBe('RS456')
    expect(result.acronym).toBeNull()
    expect(result.names).toEqual([
      { value: 'Another Research Structure', language: 'en' },
    ])
    expect(result.descriptions).toEqual([
      { value: 'Another description', language: 'en' },
    ])
    expect(result.identifiers).toEqual([])
  })
})
