export enum WordstreamTopic {
  Concepts = 'concepts',
  CoAuthors = 'collaborations',
}

export type WordItem = {
  text: string
  frequency: number
  sudden: number
  topic: WordstreamTopic
  id: string
  // uid of the underlying concept or person
  uid: string
}

export type WordstreamSlice = {
  date: string
  words: {
    [topic in WordstreamTopic]?: WordItem[]
  }
}

export class WordstreamData {
  constructor(public slices: WordstreamSlice[]) {}

  static fromJson(json: unknown): WordstreamData {
    if (Array.isArray(json)) {
      return new WordstreamData(json as WordstreamSlice[])
    }
    return new WordstreamData([])
  }

  isEmpty(): boolean {
    return this.slices.length === 0
  }

  /**
   * Uids of every item sharing the given label and topic, across all slices.
   * Mirrors the wordstream hover, which highlights words by label.
   */
  uidsOf(text: string, topic: WordstreamTopic): string[] {
    const uids = this.slices
      .flatMap((slice) => slice.words[topic] ?? [])
      .filter((item) => item.text === text)
      .map((item) => item.uid)
    return [...new Set(uids)]
  }
}
