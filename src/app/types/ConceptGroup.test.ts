import { ConceptGroup } from './ConceptGroup'
import { Concept } from './Concept'
import { Literal } from './Literal'
import { ExtendedLanguageCode } from './ExtendLanguageCode'
import { describe, expect, it } from '@jest/globals'

describe('ConceptGroup', () => {
  const concept = (
    uid: string,
    labels: [string, string][],
    type: 'PREF' | 'ALT' = 'PREF',
  ) => {
    const literals = labels.map(
      ([value, lang]) => new Literal(value, lang as ExtendedLanguageCode),
    )
    return new Concept(
      uid,
      type === 'PREF' ? literals : [],
      type === 'ALT' ? literals : [],
    )
  }

  it('should group concepts with matching labels (same language, same label)', () => {
    const c1 = concept('1', [['géographie', 'fr']])
    const c2 = concept('2', [['Geographie', 'fr']]) // accent-insensitive match

    const groups = ConceptGroup.fromConcepts([c1, c2])
    expect(groups).toHaveLength(1)
    expect(groups[0].concepts).toContain(c1)
    expect(groups[0].concepts).toContain(c2)
  })

  it('should group concepts with matching labels via "ul" language', () => {
    const c1 = concept('1', [['cartographie', 'fr']])
    const c2 = concept('2', [['Cartographie', 'ul']])

    const groups = ConceptGroup.fromConcepts([c1, c2])
    expect(groups).toHaveLength(1)
  })

  it('should not group concepts with different labels', () => {
    const c1 = concept('1', [['mathématiques', 'fr']])
    const c2 = concept('2', [['géographie', 'fr']])

    const groups = ConceptGroup.fromConcepts([c1, c2])
    expect(groups).toHaveLength(2)
  })

  it('should group across pref and alt labels', () => {
    const pref = new Literal('géographie', 'fr')
    const alt = new Literal('Géographie', 'fr')
    const c1 = new Concept('1', [pref], [])
    const c2 = new Concept('2', [], [alt])

    const groups = ConceptGroup.fromConcepts([c1, c2])
    expect(groups).toHaveLength(1)
    expect(groups[0].concepts).toEqual(expect.arrayContaining([c1, c2]))
  })

  it('getDisplayLabels returns labels in target language or fallback', () => {
    const c1 = concept('1', [['géographie', 'fr']])
    const c2 = concept('2', [['geography', 'en']])
    const group = new ConceptGroup([c1, c2])

    expect(group.getDisplayLabels('fr')).toEqual(['géographie'])
    expect(group.getDisplayLabels('en')).toEqual(['geography'])
  })

  it('getDisplayLabels falls back if no match', () => {
    const c1 = concept('1', [['mathematics', 'en']])
    const group = new ConceptGroup([c1])

    expect(group.getDisplayLabels('es')).toEqual(['mathematics'])
  })
})
