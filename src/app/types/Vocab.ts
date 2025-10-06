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
    return process.env.AVAILABLE_VOCABS?.split(',') || []
  }

  public static has(name: string) {
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

  public static getVocabs(names: string[]) {
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
}
