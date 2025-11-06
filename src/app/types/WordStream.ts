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
}
