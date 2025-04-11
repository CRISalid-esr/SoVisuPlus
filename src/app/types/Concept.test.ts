// file: src/app/types/Concept.test.ts

import { Concept } from '@/types/Concept'
import { describe, expect, it } from '@jest/globals'
import type { ConceptJson } from '@/types/Concept'

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
