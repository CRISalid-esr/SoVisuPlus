import { Vocab } from '@/types/Vocab'

export class VocabSearchClient {
  public async suggest(q: string, vocabs: Vocab[], display_langs: string) {
    const vocabsUrl = process.env.VOCABS_URL!
    const params = new URLSearchParams({
      q: q,
      vocabs: vocabs.map((vocab) => vocab.getValue()).join(),
      display_langs: display_langs,
      highlight: 'true',
    })
    return fetch(vocabsUrl + '?' + params, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
