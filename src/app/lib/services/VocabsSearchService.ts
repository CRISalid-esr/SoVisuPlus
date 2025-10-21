import { VocabsSearchClient } from '@/lib/services/VocabsSearchClient'
import { Vocab } from '@/types/Vocab'

export class VocabsSearchService {
  private client: VocabsSearchClient

  constructor() {
    this.client = new VocabsSearchClient()
  }

  async suggest(q: string, vocabs: string[], display_langs: string) {
    const convertedVocabs = Vocab.getVocabsFromNames(vocabs)
    return this.client.suggest(q, convertedVocabs, display_langs)
  }
}
