// file: src/app/types/Concept.test.ts

import type { ConceptJson } from '@/types/Concept'
import { Concept } from '@/types/Concept'
import { describe, expect, it } from '@jest/globals'

describe('Concept.fromObject', () => {
  it('should parse labels array into altLabels and prefLabels correctly', () => {
    const input: ConceptJson = {
      uid: 'http://www.wikidata.org/entity/Q3054749',
      uri: null,
      labels: [
        {
          id: 12028,
          conceptId: 3094,
          language: 'fr',
          value: 'Question du Sens',
          type: 'PREF',
        },
        {
          id: 12029,
          conceptId: 3094,
          language: 'en',
          value: 'meaning',
          type: 'ALT',
        },
        {
          id: 12030,
          conceptId: 3094,
          language: 'fr',
          value: 'Sens',
          type: 'ALT',
        },
      ],
    }

    const concept = Concept.fromObject(input)

    expect(concept.uid).toBe('http://www.wikidata.org/entity/Q3054749')
    expect(concept.uri).toBe(null)

    expect(concept.prefLabels).toHaveLength(1)
    expect(concept.prefLabels[0].value).toBe('Question du Sens')
    expect(concept.prefLabels[0].language).toBe('fr')

    expect(concept.altLabels).toHaveLength(2)
    expect(concept.altLabels.map((l) => l.value)).toEqual(
      expect.arrayContaining(['meaning', 'Sens']),
    )
  })
})

describe('Concept.getVocabulary', () => {
  it('should return WIKIDATA for a Wikidata URI', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://www.wikidata.org/entity/Q123',
    )
    expect(concept.getVocabulary()).toBe('WIKIDATA')
  })

  it('should return IDREF for an IDREF URI', () => {
    const concept = new Concept('uid', [], [], 'http://www.idref.fr/123456789')
    expect(concept.getVocabulary()).toBe('IDREF')
  })

  it('should return JEL for a ZBW JEL URI', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://zbw.eu/beta/external_identifiers/jel#J12',
    )
    expect(concept.getVocabulary()).toBe('JEL')
  })

  it('should return ABES for an ABES URI', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://hub.abes.fr/subject/abc123',
    )
    expect(concept.getVocabulary()).toBe('ABES')
  })

  it('should return UNKNOWN for an unrecognized URI', () => {
    const concept = new Concept('uid', [], [], 'http://example.com/unknown/123')
    expect(concept.getVocabulary()).toBe('UNKNOWN')
  })

  it('should return null when uri is null', () => {
    const concept = new Concept('uid', [], [], null)
    expect(concept.getVocabulary()).toBeNull()
  })
})

describe('Concept.getIdentifier', () => {
  it('should extract Wikidata identifier', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://www.wikidata.org/entity/Q789',
    )
    expect(concept.getIdentifier()).toBe('Q789')
  })

  it('should extract IDREF identifier', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://www.idref.fr/040661474/id',
    )
    expect(concept.getIdentifier()).toBe('040661474')
  })

  it('should extract JEL identifier', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://zbw.eu/beta/external_identifiers/jel#J24',
    )
    expect(concept.getIdentifier()).toBe('J24')
  })

  it('should extract ABES identifier', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://hub.abes.fr/cairn/periodical/reco/2020/issue_reco712/D33CDC7CE2EF45D0E053120B220A6050/subject/modeledeschmeidler',
    )
    expect(concept.getIdentifier()).toBe('modeledeschmeidler')
  })

  it('should return empty string for unknown vocabulary', () => {
    const concept = new Concept('uid', [], [], 'http://example.com/vocab/xyz')
    expect(concept.getIdentifier()).toBe('')
  })

  it('should return empty string if uri is null', () => {
    const concept = new Concept('uid', [], [], null)
    expect(concept.getIdentifier()).toBe('')
  })

  it('should return empty string if uri format does not match expected pattern', () => {
    const concept = new Concept(
      'uid',
      [],
      [],
      'http://www.wikidata.org/wrong/Q999',
    )
    expect(concept.getIdentifier()).toBe('')
  })
})
