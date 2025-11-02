import { VocabSearchClient } from '@/lib/services/VocabSearchClient'
import { Vocab } from '@/types/Vocab'

export class VocabSearchService {
  private client: VocabSearchClient

  public constructor() {
    this.client = new VocabSearchClient()
  }

  public async suggest(
    q: string,
    vocabs: string[],
    limit: number,
    offset: number,
    highlight: boolean,
    display_langs: string,
  ) {
    const convertedVocabs = Vocab.getVocabsFromNames(vocabs)
    return this.client.suggest(
      q,
      convertedVocabs,
      limit,
      offset,
      highlight,
      display_langs,
    )
  }
}
