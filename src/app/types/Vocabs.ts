export const vocabs = process.env.VOCABS_AVAILABLE?.split(',') || []
export const fields = ['pref', 'alt', 'description', 'search_all'] as const
export const broaderOrNarrower = ['ids', 'full'] as const

export function getVocab(name: string) {
  const vocab = vocabs.find((vocab) => vocab === name.toLowerCase())
  if (vocab === undefined) {
    throw Error(`Unknown vocab: ${name}`)
  } else {
    return vocab
  }
}

export function getVocabs(names: string[]) {
  return names.map((name) => getVocab(name))
}

export function getField(name: string) {
  const field = fields.find((field) => field == name.toLowerCase())
  if (field == undefined) {
    throw Error(`Unknown field: ${name}`)
  } else {
    return field
  }
}

export function getFields(names: string[]) {
  return names.map((name) => getField(name))
}

export function getBroaderOrNarrower(name: string) {
  const bon = broaderOrNarrower.find((bon) => bon == name.toLowerCase())
  if (bon == undefined) {
    throw Error(`Unknown broader or narrower: ${name}`)
  } else {
    return bon
  }
}
