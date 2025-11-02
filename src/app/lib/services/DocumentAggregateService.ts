import {
  DocumentAggregateDAO,
  DocumentForWordStreamAggregation,
} from '@/lib/daos/DocumentAggregateDAO'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { AgentType } from '@/types/IAgent'
import { DocumentService } from '@/lib/services/DocumentService'
import { Literal } from '@/types/Literal'
import { WordItem, WordstreamSlice, WordstreamTopic } from '@/types/WordStream'
import { conceptFilterService } from '@/lib/services/ConceptFilterService'

export const isWordstreamTopic = (v: unknown): v is WordstreamTopic =>
  v === WordstreamTopic.Concepts || v === WordstreamTopic.CoAuthors

export class DocumentAggregateService {
  private aggregateDAO: DocumentAggregateDAO
  private documentService: DocumentService

  constructor() {
    this.aggregateDAO = new DocumentAggregateDAO()
    this.documentService = new DocumentService()
  }

  /**
   * Compute wordstream rows for a given contributor (person or org), aggregated per year.
   *
   * @param agentUid - person UID or organization UID (depending on contributorType)
   * @param agentType - 'person' | 'research_structure' | 'institution'
   * @param preferredLanguage - language preference to pick concept labels
   * @param topics - which streams to compute (Concepts, CoAuthors)
   * @param opts - optional options
   */
  async computeWordStreamForAgent(
    agentUid: string | null,
    agentType: AgentType,
    preferredLanguage: ExtendedLanguageCode,
    topics: WordstreamTopic[] = [
      WordstreamTopic.Concepts,
      WordstreamTopic.CoAuthors,
    ],
    opts?: {
      fromYear?: number
      toYear?: number
      topNPerTopic?: number
    },
  ): Promise<WordstreamSlice[]> {
    const contributorUids = await this.documentService.buildContributorUidArray(
      agentUid,
      agentType,
    )
    if (contributorUids.length === 0) {
      return []
    }

    // Incoming data for db aggregation
    const documentsForWordStream =
      await this.aggregateDAO.fetchDocsForPersonAggregation(contributorUids, {
        fromYear: opts?.fromYear,
        toYear: opts?.toYear,
      })

    const result: WordstreamSlice[] = []

    // Intermediate frequencies storage
    const frequencies: Record<
      WordstreamTopic,
      Record<number, Record<string, { text: string; frequency: number }>>
    > = {
      [WordstreamTopic.Concepts]: {},
      [WordstreamTopic.CoAuthors]: {},
    }

    const selectedTopics = new Set(topics)

    for (const doc of documentsForWordStream) {
      if (doc.year == null) continue
      const year = doc.year

      if (
        selectedTopics.has(WordstreamTopic.Concepts) &&
        doc.subjects?.length
      ) {
        for (const c of doc.subjects) {
          // Skip Wikidata concepts to avoid noise from OpenAlex
          if (
            conceptFilterService.matchesRegexPattern(
              c.uri,
              /\/\/(?:www\.)?wikidata\.org\//i,
            )
          ) {
            continue
          }
          const label = this.pickConceptLabelFromPref(
            c.prefLabels,
            preferredLanguage,
          )
          if (!label) continue
          if (await conceptFilterService.matchesLabelList(label)) {
            continue
          }
          const tokenKey = `concept:${c.uid}`
          this.updateFreqencies(
            frequencies,
            WordstreamTopic.Concepts,
            year,
            tokenKey,
            label,
          )
        }
      }

      if (
        selectedTopics.has(WordstreamTopic.CoAuthors) &&
        doc.coauthors?.length
      ) {
        for (const p of doc.coauthors) {
          const label = this.buildPersonLabel(p)
          if (!label) continue
          const tokenKey = `person:${p.uid}`
          this.updateFreqencies(
            frequencies,
            WordstreamTopic.CoAuthors,
            year,
            tokenKey,
            label,
          )
        }
      }
    }

    // compute the list of years to process, e.g. [2018, 2019, 2020, 2021]
    const years = this.collectSortedYears(
      documentsForWordStream,
      opts?.fromYear,
      opts?.toYear,
    )
    // keep track of previous frequencies per topic and token
    const prev: Record<WordstreamTopic, Record<string, number>> = {
      [WordstreamTopic.Concepts]: {},
      [WordstreamTopic.CoAuthors]: {},
    }

    for (const year of years) {
      const words: { [topic in WordstreamTopic]: WordItem[] } = {
        [WordstreamTopic.Concepts]: [],
        [WordstreamTopic.CoAuthors]: [],
      }

      for (const topic of selectedTopics) {
        const bucket = frequencies[topic][year] || {}
        const items = this.buildWordItems(bucket, prev, topic, year)
        words[topic] = this.sortWordItems(items, opts?.topNPerTopic)
      }

      result.push({
        date: String(year),
        words,
      })
    }

    return result
  }

  // Sort WordItems by frequency and trim to topNPerTopic if specified
  private sortWordItems(items: WordItem[], topNPerTopic?: number) {
    if (typeof topNPerTopic === 'number' && topNPerTopic > 0) {
      const sorted = items.sort((a, b) => b.frequency - a.frequency)
      return sorted.slice(0, topNPerTopic)
    } else {
      return items.sort((a, b) => b.frequency - a.frequency)
    }
  }

  // Build WordItems from a frequency bucket by computing 'sudden' values
  private buildWordItems(
    bucket: Record<
      string,
      {
        text: string
        frequency: number
      }
    >,
    prev: Record<WordstreamTopic, Record<string, number>>,
    topic: WordstreamTopic,
    year: number,
  ) {
    const items: WordItem[] = Object.entries(bucket).map(
      ([tokenKey, entry]) => {
        const last = prev[topic][tokenKey] || 0
        const sudden = Math.max(0, entry.frequency - last)
        prev[topic][tokenKey] = entry.frequency
        return {
          text: entry.text,
          frequency: entry.frequency,
          sudden,
          topic,
          id: this.buildId(entry.text, topic, year),
        }
      },
    )
    return items
  }

  // Upsert frequency entry in the frequencies structure
  private updateFreqencies(
    frequencies: Record<
      WordstreamTopic,
      Record<number, Record<string, { text: string; frequency: number }>>
    >,
    topic: WordstreamTopic,
    year: number,
    tokenKey: string,
    label: string,
  ) {
    if (!frequencies[topic][year]) {
      frequencies[topic][year] = {}
    }
    const bucket = frequencies[topic][year]
    if (!bucket[tokenKey]) {
      bucket[tokenKey] = { text: label, frequency: 1 }
    } else {
      bucket[tokenKey].frequency += 1
    }
  }

  // build a unique ID for a wordstream item
  // eg : "Methodes éducatives" >> "methodes_educatives_concept_2020"
  private buildId(text: string, topic: WordstreamTopic, year: number): string {
    const slug = text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return `${slug}_${topic}_${year}`
  }

  private buildPersonLabel(p: {
    displayName?: string | null
    firstName: string | null
    lastName: string | null
  }): string {
    return (
      p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || ''
    )
  }

  private pickConceptLabelFromPref(
    prefLabels: Literal[] | undefined,
    preferred: ExtendedLanguageCode,
  ): string | null {
    if (!prefLabels || prefLabels.length === 0) return null
    const exact = prefLabels.find((l) => l.language === preferred)?.value
    if (exact) return exact
    return prefLabels[0]?.value ?? null
  }

  private collectSortedYears(
    docs: DocumentForWordStreamAggregation[],
    fromYear?: number,
    toYear?: number,
  ): number[] {
    const s = new Set<number>()
    for (const d of docs) {
      if (d.year == null) continue
      if (fromYear && d.year < fromYear) continue
      if (toYear && d.year > toYear) continue
      s.add(d.year)
    }
    return [...s].sort((a, b) => a - b)
  }
}
