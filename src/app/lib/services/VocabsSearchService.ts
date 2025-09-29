import ISO6391, { LanguageCode } from 'iso-639-1'
import { VocabsSearchClient } from '@/lib/services/VocabsSearchClient'
import {
  broaderOrNarrower,
  fields,
  getBroaderOrNarrower,
  getFields,
  getVocabs,
  vocabs,
} from '@/types/Vocabs'

type Vocab = (typeof vocabs)[number]
type Field = (typeof fields)[number]
type BroaderOrNarrower = (typeof broaderOrNarrower)[number]

export class VocabsSearchService {
  private client: VocabsSearchClient
  private params: {
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
  }

  constructor(
    q: string,
    vocabs: string[],
    langs: string[],
    fields: string[],
    display_langs: string[],
    display_fields: string[],
    limit: number,
    offset: number,
    highlight: string,
    broader: string,
    narrower: string,
    broader_depth: number,
    narrower_depth: number,
  ) {
    if (!Number.isInteger(limit)) {
      throw new Error("Invalid parameter 'limit' : must be an integer")
    }
    if (!Number.isInteger(offset)) {
      throw new Error("Invalid parameter 'offset' : must be an integer")
    }
    if (!(highlight === 'true' || highlight === 'false')) {
      throw new Error(
        "Invalid parameter 'highlight' : must be 'true' or 'false'",
      )
    }
    if (!Number.isInteger(broader_depth)) {
      throw new Error("Invalid parameter 'broader_depth' : must be an integer")
    }
    if (!Number.isInteger(narrower_depth)) {
      throw new Error("Invalid parameter 'narrower_depth' : must be an integer")
    }
    this.params = {
      q: q,
      vocabs: getVocabs(vocabs),
      langs: langs
        .map((lang) => ISO6391.getCode(lang))
        .filter((lang) => lang != ''),
      fields: getFields(fields),
      display_langs: display_langs
        .map((lang) => ISO6391.getCode(lang))
        .filter((lang) => lang != ''),
      display_fields: getFields(display_fields),
      limit: (() => {
        if (limit < 1) {
          return 1
        } else if (limit > 100) {
          return 100
        } else {
          return limit
        }
      })(),
      offset: offset < 0 ? 0 : offset,
      highlight: Boolean(highlight),
      broader: getBroaderOrNarrower(broader),
      narrower: getBroaderOrNarrower(narrower),
      broader_depth: broader_depth == 1 ? 1 : -1, //depends on broader ?
      narrower_depth: narrower_depth == 1 ? 1 : -1, //depends on narrower ?
    }
    this.client = new VocabsSearchClient(this.params)
  }

  async getResult() {
    return this.client.getResult()
  }
}
