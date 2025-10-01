import { VocabsSearchClient } from '@/lib/services/VocabsSearchClient'
import { getVocabs } from '@/types/Vocabs'

export class VocabsSearchService {
  private client: VocabsSearchClient

  constructor() {
    this.client = new VocabsSearchClient()
  }

  async suggest(q: string, vocabs: string[], display_langs: string) {
    const convertedVocabs = getVocabs(vocabs)
    return this.client.suggest(q, convertedVocabs, display_langs)
  }
}
