import { ResearchStructure } from '@/types/ResearchStructure'
import { describe, expect, it } from '@jest/globals'
import { ResearchStructureIdentifierType } from '@/types/ResearchStructureIdentifier'

describe('ResearchStructure', () => {
  it('should create a valid ResearchStructure object', () => {
    const validResearchStructure = new ResearchStructure(
      'RS123',
      'ABC',
      { en: 'Valid Research Structure' },
      { en: 'Valid Description' },
      [
        { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
        { type: ResearchStructureIdentifierType.ROR, value: '67890' },
      ],
    )

    // Validate the object properties
    expect(validResearchStructure).toBeInstanceOf(ResearchStructure)
    expect(validResearchStructure.uid).toBe('RS123')
    expect(validResearchStructure.acronym).toBe('ABC')
    expect(validResearchStructure.names).toEqual({
      en: 'Valid Research Structure',
    })
    expect(validResearchStructure.descriptions).toEqual({
      en: 'Valid Description',
    })
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
        { en: 'Invalid Research Structure' },
        { en: 'Invalid Description' },
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
      names: { en: 'Research Structure', fr: 'Structure de Recherche' },
      descriptions: {
        en: 'Description in English',
        fr: 'Description en Français',
      },
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
    expect(result.names).toEqual({
      en: 'Research Structure',
      fr: 'Structure de Recherche',
    })
    expect(result.descriptions).toEqual({
      en: 'Description in English',
      fr: 'Description en Français',
    })
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
      names: { en: 'Another Research Structure' },
      descriptions: { en: 'Another description' },
    }

    const result =
      ResearchStructure.fromDbResearchStructure(dbResearchStructure)

    expect(result).toBeInstanceOf(ResearchStructure)
    expect(result.uid).toBe('RS456')
    expect(result.acronym).toBeNull()
    expect(result.names).toEqual({ en: 'Another Research Structure' })
    expect(result.descriptions).toEqual({ en: 'Another description' })
    expect(result.identifiers).toEqual([])
  })
})
