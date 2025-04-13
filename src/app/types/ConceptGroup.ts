import { Concept } from './Concept'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import removeAccents from 'remove-accents'

class ConceptGroup {
  constructor(public concepts: Concept[] = []) {}

  getDisplayLabels(language: ExtendedLanguageCode): string[] {
    const labels = new Set<string>()

    for (const concept of this.concepts) {
      const label = concept.prefLabels.find((l) => l.language === language)
      if (label) labels.add(label.value)
    }

    if (labels.size === 0) {
      for (const concept of this.concepts) {
        if (concept.prefLabels.length > 0) {
          labels.add(concept.prefLabels[0].value)
        }
      }
    }

    return Array.from(labels)
  }

  addConcept(concept: Concept): void {
    this.concepts.push(concept)
  }

  static fromConcepts(concepts: Concept[]): ConceptGroup[] {
    const groups: ConceptGroup[] = []
    const seen = new Set<Concept>()

    const getNormalizedLabels = (
      concept: Concept,
    ): Array<{ key: string; lang: string }> => {
      return [...concept.prefLabels, ...concept.altLabels].map((label) => ({
        key: this.normalizeLabel(label.value),
        lang: label.language,
      }))
    }

    for (const concept of concepts) {
      if (seen.has(concept)) continue

      const group = new ConceptGroup([concept])
      seen.add(concept)
      const baseLabels = getNormalizedLabels(concept)

      for (const other of concepts) {
        if (seen.has(other)) continue

        const otherLabels = getNormalizedLabels(other)
        const match = baseLabels.some(({ key: baseKey, lang: baseLang }) => {
          return otherLabels.some(({ key: otherKey, lang: otherLang }) => {
            const sameLang = baseLang === otherLang
            const ulMatch = baseLang === 'ul' || otherLang === 'ul'
            return baseKey === otherKey && (sameLang || ulMatch)
          })
        })

        if (match) {
          group.addConcept(other)
          seen.add(other)
        }
      }

      groups.push(group)
    }

    return groups
  }

  static normalizeLabel(str: string): string {
    return removeAccents(str)
      .toLowerCase()
      .replace(/\p{P}+/gu, '') // remove punctuation
      .trim()
  }
}

export { ConceptGroup }
