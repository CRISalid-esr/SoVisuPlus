import { VOCABS } from '@/lib/services/Vocabs'
import { getRuntimeEnv } from '@/utils/runtimeEnv'

export class Vocab {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  public getValue(): string {
    return this.value
  }

  public static getVocabs() {
    const env =
      typeof window === 'undefined'
        ? process.env.NEXT_PUBLIC_AVAILABLE_VOCABS
        : getRuntimeEnv().NEXT_PUBLIC_AVAILABLE_VOCABS
    return env?.split(',').map((v) => v.toLowerCase()) || []
  }

  public static has(name: string) {
    const vocab = Vocab.getVocabs()?.find(
      (vocab) => vocab === name.toLowerCase(),
    )
    return vocab !== undefined
  }

  public static fromString(name: string): Vocab {
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
