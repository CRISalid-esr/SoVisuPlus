import {
  findDocumentSearchChunks,
  findFuzzyMatchChunks,
  fuzzyMatch,
  fuzzyScore,
  normalizeSearchText,
  osaDistance,
  tokenizeDocumentSearchQuery,
  tokenizeSearchQuery,
  trigramSimilarity,
} from './fuzzySearch'

const highlighted = (text: string, query: string) =>
  findFuzzyMatchChunks(text, query).map(({ start, end }) =>
    text.slice(start, end),
  )

describe('normalizeSearchText', () => {
  it('removes case and diacritics', () => {
    expect(normalizeSearchText('Économie Générale')).toBe('economie generale')
    expect(normalizeSearchText('Œuvre')).toBe('oeuvre')
  })
})

describe('tokenizeSearchQuery', () => {
  it('splits on non alphanumeric characters and dedupes', () => {
    expect(tokenizeSearchQuery('  Panthéon-Sorbonne, paris PARIS ')).toEqual([
      'pantheon',
      'sorbonne',
      'paris',
    ])
  })

  it('caps the number of tokens', () => {
    expect(tokenizeSearchQuery('a b c d e f g h')).toHaveLength(6)
    expect(tokenizeSearchQuery('a b c d e f g h', 7)).toHaveLength(7)
  })

  it('truncates overly long tokens', () => {
    const [token] = tokenizeSearchQuery('a'.repeat(10_000))
    expect(token).toHaveLength(100)
  })

  it('returns no token for a blank query', () => {
    expect(tokenizeSearchQuery(' - ')).toEqual([])
  })
})

describe('trigramSimilarity', () => {
  it('matches pg_trgm similarity', () => {
    // 5 shared trigrams out of 9 distinct ones
    expect(trigramSimilarity('dupond', 'dupont')).toBeCloseTo(5 / 9)
    expect(trigramSimilarity('Dupont', 'dupont')).toBe(1)
    expect(trigramSimilarity('', 'dupont')).toBe(0)
  })
})

describe('osaDistance', () => {
  it('counts edits and adjacent transpositions', () => {
    expect(osaDistance('dupond', 'dupont', 2)).toBe(1)
    expect(osaDistance('jaen', 'jean', 2)).toBe(1)
    expect(osaDistance('sorbone', 'sorbonne', 2)).toBe(1)
    expect(osaDistance('kitten', 'sitting', 3)).toBe(3)
  })

  it('stops beyond the maximum', () => {
    expect(osaDistance('abc', 'xyz', 1)).toBe(2)
    expect(osaDistance('a', 'abcdef', 2)).toBe(3)
  })
})

describe('fuzzyScore', () => {
  it('matches everything with an empty query', () => {
    expect(fuzzyScore('', 'anything')).toBe(1)
  })

  it('ignores case, diacritics and word order', () => {
    expect(fuzzyMatch('elodie durand', 'Durand Élodie')).toBe(true)
    expect(fuzzyMatch('universite paris', 'Université Paris 1')).toBe(true)
  })

  it('tolerates typos', () => {
    expect(fuzzyMatch('dupond', 'Jean Dupont')).toBe(true)
    expect(fuzzyMatch('jaen', 'Jean Dupont')).toBe(true)
    expect(fuzzyMatch('pantheon sorbone', 'Panthéon-Sorbonne')).toBe(true)
    expect(fuzzyMatch('sorbnne', 'Sorbonne')).toBe(true)
  })

  it('tolerates typos in a word still being typed', () => {
    expect(fuzzyMatch('sorbn', 'Sorbonne')).toBe(true)
  })

  it('requires every word to match', () => {
    expect(fuzzyMatch('dupont zzzz', 'Jean Dupont')).toBe(false)
  })

  it('does not apply typo tolerance to short words', () => {
    expect(fuzzyMatch('dup', 'Jean Dupont')).toBe(true)
    expect(fuzzyMatch('dyp', 'Jean Dupont')).toBe(false)
  })

  it('matches across several texts', () => {
    expect(fuzzyMatch('isjps philosophie', ['ISJPS', 'Philosophie'])).toBe(true)
    expect(fuzzyMatch('isjps', [null, undefined, 'ISJPS'])).toBe(true)
  })

  it('ranks exact words above prefixes, substrings and typos', () => {
    const exact = fuzzyScore('dupont', 'Jean Dupont')
    const prefix = fuzzyScore('dupon', 'Jean Dupont')
    const substring = fuzzyScore('upont', 'Jean Dupont')
    const typo = fuzzyScore('dupond', 'Jean Dupont')
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(substring)
    expect(substring).toBeGreaterThan(typo)
    expect(typo).toBeGreaterThan(0)
  })
})

describe('findFuzzyMatchChunks', () => {
  it('returns nothing for an empty query', () => {
    expect(findFuzzyMatchChunks('Jean Dupont', ' ')).toEqual([])
  })

  it('highlights substring matches on the original characters', () => {
    expect(highlighted('Université Paris', 'universite par')).toEqual([
      'Université Par',
    ])
    expect(highlighted('Économie', 'conom')).toEqual(['conom'])
  })

  it('maps back through length-changing normalization', () => {
    expect(highlighted('Œuvre complète', 'complete')).toEqual(['complète'])
    expect(highlighted('Œuvre', 'oeuv')).toEqual(['Œuv'])
  })

  it('highlights the whole word for typo matches', () => {
    expect(highlighted('Jean Dupont', 'dupond')).toEqual(['Dupont'])
  })

  it('merges chunks separated only by whitespace', () => {
    expect(highlighted('John Doe', 'doe john')).toEqual(['John Doe'])
    expect(highlighted('Jean-Paul Dupont', 'jean dupont')).toEqual([
      'Jean',
      'Dupont',
    ])
  })

  it('returns every occurrence, sorted', () => {
    expect(findFuzzyMatchChunks('Paris, Paris', 'paris')).toEqual([
      { start: 0, end: 5 },
      { start: 7, end: 12 },
    ])
  })
})

describe('tokenizeDocumentSearchQuery', () => {
  it('keeps up to 30 words', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
    expect(tokenizeDocumentSearchQuery(words)).toHaveLength(30)
  })

  it('ignores short words when longer ones exist', () => {
    expect(tokenizeDocumentSearchQuery('Économie de la santé')).toEqual([
      'economie',
      'sante',
    ])
    expect(tokenizeDocumentSearchQuery('Li')).toEqual(['li'])
  })
})

describe('findDocumentSearchChunks', () => {
  const chunksOf = (text: string, searchWords: (string | undefined)[]) =>
    findDocumentSearchChunks({
      searchWords: searchWords as string[],
      textToHighlight: text,
    }).map(({ start, end }) => text.slice(start, end))

  it('highlights typo matches of the global search and column filter', () => {
    expect(
      chunksOf('Deep Learning pour la politique', ['learnng', 'politque']),
    ).toEqual(['Learning', 'politique'])
  })

  it('ignores missing searches and short words', () => {
    expect(chunksOf('La santé de la ville', ['sante de', undefined])).toEqual([
      'santé',
    ])
    expect(chunksOf('La santé', ['', undefined])).toEqual([])
  })
})
