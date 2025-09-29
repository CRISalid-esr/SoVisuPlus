import { broaderOrNarrower, fields, vocabs } from '@/types/Vocabs'
import { LanguageCode } from 'iso-639-1'

type Vocab = (typeof vocabs)[number]
type Field = (typeof fields)[number]
type BroaderOrNarrower = (typeof broaderOrNarrower)[number]

export class VocabsSearchClient {
  private vocabsUrl = process.env.VOCABS_URL!
  private readonly params: URLSearchParams

  constructor(params: {
    q: string
    vocabs: Vocab[]
    langs: LanguageCode[]
    fields: Field[]
    display_langs: LanguageCode[]
    display_fields: Field[]
    limit: number
    offset: number
    highlight: boolean
    broader: BroaderOrNarrower
    narrower: BroaderOrNarrower
    broader_depth: 1 | -1
    narrower_depth: 1 | -1
  }) {
    this.params = new URLSearchParams({
      q: params.q,
      vocabs: params.vocabs.join(),
      langs: params.langs.join(),
      fields: params.fields.join(),
      display_langs: params.display_langs.join(),
      display_fields: params.display_fields.join(),
      limit: params.limit.toString(),
      offset: params.offset.toString(),
      highlight: params.highlight.toString(),
      broader: params.broader,
      narrower: params.narrower,
      broader_depth: params.broader_depth.toString(),
      narrower_depth: params.narrower_depth.toString(),
    })
  }

  async getResult() {
    return await fetch(this.vocabsUrl + '?' + this.params, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
