import { VOCABS } from '@/lib/services/Vocabs'
import { getRuntimeEnv } from '@/utils/runtimeEnv'

export class Vocab {
  private static vocabs: string[] | null = null

  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  public getValue(): string {
    return this.value
  }

  private static init() {
    if (this.vocabs === null) {
      const env = process.env.NEXT_PUBLIC_AVAILABLE_VOCABS
      this.vocabs = env?.split(',').map((v) => v.toLowerCase()) || []
    }
  }

  public static getVocabs() {
    this.init()
    return this.vocabs
  }

  public static has(name: string) {
    this.init()
    const vocab = Vocab.vocabs?.find((vocab) => vocab === name.toLowerCase())
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

  public static validVocabIri(iri: string, vocab: string) {
    if (this.has(vocab)) {
      return !!VOCABS[vocab.toUpperCase()]?.iriPatterns.find((pattern) =>
        pattern.test(iri),
      )
    } else {
      return false
    }
  }

  public static iriToIdentifier(iri: string, vocab: string) {
    if (this.has(vocab)) {
      const iriPattern = VOCABS[vocab.toUpperCase()]?.iriPatterns.find(
        (pattern) => pattern.test(iri),
      )
      if (iriPattern) {
        const identifier = iri.match(iriPattern)?.groups?.identifier ?? ''
        return identifier.replace(/\./g, ' - ')
      } else {
        const identifier = iri.match(RegExp('[A-Z0-9]+$'))
        return identifier
          ? identifier[identifier.length - 1].replace(/\./g, ' - ')
          : ''
      }
    } else {
      return ''
    }
  }
}
