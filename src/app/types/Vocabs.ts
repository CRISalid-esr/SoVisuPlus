export const vocabs = process.env.VOCABS_AVAILABLE?.split(',') || []

export function getVocab(name: string) {
  const vocab = vocabs.find((vocab) => vocab === name.toLowerCase())
  if (vocab === undefined) {
    throw Error(`Vocab ${name} unavailable`)
  } else {
    return vocab
  }
}

export function getVocabs(names: string[]) {
  return names
    .map((name) => {
      try {
        return getVocab(name)
      } catch (error) {
        console.error(error)
      }
    })
    .filter((vocab) => vocab !== undefined)
}
