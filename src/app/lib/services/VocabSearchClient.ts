import { Vocab } from '@/types/Vocab'
import { z } from 'zod'

const LabelSchema = z.object({
  text: z.string(),
  lang: z.string(),
  highlight: z.string().nullable(),
})
const VocabItemSchema = z.object({
  iri: z.string(),
  scheme: z.string(),
  vocab: z.string().nullable(),
  identifier: z.string().nullable(),
  top_concept: z.boolean(),
  lang_set: z.array(z.string()),
  score: z.number(),
  best_label: LabelSchema.extend({
    source_field: z.string(),
  }).nullable(),
  pref: z.array(LabelSchema).nullable(),
  alt: z.array(LabelSchema).nullable(),
  description: z.array(LabelSchema).nullable(),
  broader: z.array(z.string()),
  narrower: z.array(z.string()),
})

export const SuggestResponseSchema = z.object({
  total: z.number(),
  items: z.array(VocabItemSchema),
})

export type SuggestResponse = z.infer<typeof SuggestResponseSchema>

export class VocabSearchClient {
  public async suggest(
    q: string,
    vocabs: Vocab[],
    display_langs: string,
  ): Promise<SuggestResponse> {
    const vocabsUrl = process.env.VOCABS_URL!
    const params = new URLSearchParams({
      q: q,
      vocabs: vocabs.map((vocab) => vocab.getValue()).join(),
      display_langs: display_langs,
      highlight: 'true',
    })
    const response = await fetch(vocabsUrl + '?' + params, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const json = await response.json()
    return SuggestResponseSchema.parse(json)
  }
}
