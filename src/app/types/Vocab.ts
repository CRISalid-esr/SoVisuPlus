import { VOCABS } from '@/lib/services/Vocabs'

export class Vocab {
  private static vocabs = Vocab.init()

  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  public getValue(): string {
    return this.value
  }

  private static init() {
    return process.env.NEXT_PUBLIC_AVAILABLE_VOCABS?.split(',') || []
  }

  public static getVocabs() {
    this.init()
    return this.vocabs
  }

  public static has(name: string) {
    this.init()
    const vocab = Vocab.vocabs.find((vocab) => vocab === name.toLowerCase())
    return vocab !== undefined
  }

  public static fromString(name: string): Vocab {
    this.init()
    const isVocab = Vocab.has(name.toLowerCase())
    if (!isVocab) {
      throw new Error(`${name} is not an available vocab`)
    } else {
      return new Vocab(name)
    }
  }

  public static getVocabsFromNames(names: string[]) {
    return names
      .map((name) => {
        try {
          return Vocab.fromString(name)
        } catch (error) {
          console.error(error)
        }
      })
      .filter((vocab) => vocab !== undefined)
  }

  public static iriToIdentifier(iri: string, vocab: string) {
    if (this.has(vocab)) {
      const identifiers = VOCABS[vocab.toUpperCase()]
        ? iri.match(VOCABS[vocab.toUpperCase()])
        : iri.match(RegExp('[A-Z,0-9]+$'))
      return identifiers
        ? identifiers[identifiers.length - 1].replaceAll('.', ' - ')
        : ''
    } else {
      return ''
    }
  }
}
