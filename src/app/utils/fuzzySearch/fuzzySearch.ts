import removeAccents from 'remove-accents'
import {
  MAX_SEARCH_TOKENS,
  MIN_TYPO_TOKEN_LENGTH,
  TWO_EDITS_TOKEN_LENGTH,
  WORD_VARIANT_SIMILARITY_THRESHOLD,
} from './constants'

// Built with the constructor: Unicode property escapes need an ES2018 target.
const wordPattern = () => new RegExp('[\\p{L}\\p{N}]+', 'gu')

interface Word {
  value: string
  start: number
  end: number
}

export interface MatchChunk {
  start: number
  end: number
}

/**
 * Case- and diacritics-insensitive form used for every search comparison.
 * Must stay identical to the stored `Person.normalizedName`.
 */
export const normalizeSearchText = (value: string): string =>
  removeAccents(value).toLowerCase()

const wordsOf = (normalizedText: string): Word[] =>
  Array.from(normalizedText.matchAll(wordPattern()), (match) => ({
    value: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))

/** Distinct normalized words of a query, capped to MAX_SEARCH_TOKENS. */
export const tokenizeSearchQuery = (query: string): string[] =>
  [
    ...new Set(wordsOf(normalizeSearchText(query)).map((word) => word.value)),
  ].slice(0, MAX_SEARCH_TOKENS)

const trigramsOf = (normalizedText: string): Set<string> => {
  const trigrams = new Set<string>()
  for (const { value } of wordsOf(normalizedText)) {
    // Same padding as PostgreSQL pg_trgm: two spaces before, one after
    const padded = `  ${value} `
    for (let i = 0; i + 3 <= padded.length; i++) {
      trigrams.add(padded.slice(i, i + 3))
    }
  }
  return trigrams
}

/** Jaccard similarity of trigram sets, as pg_trgm `similarity()`. */
export const trigramSimilarity = (a: string, b: string): number => {
  const trigramsA = trigramsOf(normalizeSearchText(a))
  const trigramsB = trigramsOf(normalizeSearchText(b))
  if (trigramsA.size === 0 || trigramsB.size === 0) {
    return 0
  }
  let shared = 0
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) {
      shared++
    }
  }
  return shared / (trigramsA.size + trigramsB.size - shared)
}

/**
 * Optimal string alignment distance (Levenshtein plus adjacent
 * transpositions). Returns `max + 1` as soon as the distance exceeds `max`.
 */
export const osaDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1
  }
  let twoRowsBack: number[] = []
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, twoRowsBack[j - 2] + 1)
      }
      current.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) {
      return max + 1
    }
    twoRowsBack = previous
    previous = current
  }
  return Math.min(previous[b.length], max + 1)
}

const maxEditsFor = (token: string) =>
  token.length >= TWO_EDITS_TOKEN_LENGTH ? 2 : 1

/** Typo score of a token against a single word, 0 when too different. */
const typoScore = (token: string, word: string): number => {
  const maxEdits = maxEditsFor(token)
  const distance = osaDistance(token, word, maxEdits)
  if (distance <= maxEdits) {
    return 0.7 - 0.1 * distance
  }
  // The user may still be typing: compare with the word's beginning (not for
  // the shortest tokens, whose one-edit prefixes match far too many words)
  if (word.length > token.length && token.length > MIN_TYPO_TOKEN_LENGTH) {
    const prefixDistance = osaDistance(
      token,
      word.slice(0, token.length),
      maxEdits,
    )
    if (prefixDistance <= maxEdits) {
      return 0.6 - 0.1 * prefixDistance
    }
  }
  const similarity = trigramSimilarity(token, word)
  return similarity >= WORD_VARIANT_SIMILARITY_THRESHOLD ? 0.6 * similarity : 0
}

/**
 * Score (0..1) of a normalized token against a normalized text: exact word
 * 1, word prefix 0.9, substring 0.8, then typo-tolerant word matches for
 * tokens of at least MIN_TYPO_TOKEN_LENGTH characters.
 */
const scoreToken = (token: string, normalizedText: string, words: Word[]) => {
  if (words.some((word) => word.value === token)) return 1
  if (words.some((word) => word.value.startsWith(token))) return 0.9
  if (normalizedText.includes(token)) return 0.8
  if (token.length < MIN_TYPO_TOKEN_LENGTH) return 0
  return Math.max(0, ...words.map((word) => typoScore(token, word.value)))
}

/**
 * Relevance (0..1) of a free-text query against one or several texts. Every
 * query word must match one of the texts (in any order), otherwise 0. An
 * empty query matches everything with score 1.
 */
export const fuzzyScore = (
  query: string,
  texts: string | (string | null | undefined)[],
): number => {
  const tokens = tokenizeSearchQuery(query)
  if (tokens.length === 0) {
    return 1
  }
  const normalizedText = (Array.isArray(texts) ? texts : [texts])
    .filter((text): text is string => !!text)
    .map(normalizeSearchText)
    .join(' ')
  const words = wordsOf(normalizedText)
  let total = 0
  for (const token of tokens) {
    const score = scoreToken(token, normalizedText, words)
    if (score === 0) {
      return 0
    }
    total += score
  }
  return total / tokens.length
}

export const fuzzyMatch = (
  query: string,
  texts: string | (string | null | undefined)[],
): boolean => fuzzyScore(query, texts) > 0

/**
 * Ranges of `text` (original indexes) matched by `query`, for
 * react-highlight-words `findChunks`. Substring matches highlight the exact
 * characters; typo matches highlight the whole word.
 */
export const findFuzzyMatchChunks = (
  text: string,
  query: string,
): MatchChunk[] => {
  const tokens = tokenizeSearchQuery(query)
  if (tokens.length === 0 || !text) {
    return []
  }
  // Normalize character by character to map back to original indexes, since
  // normalization may change the length (e.g. "œ" becomes "oe").
  let normalizedText = ''
  const originalStart: number[] = []
  const originalEnd: number[] = []
  let index = 0
  for (const character of text) {
    const normalized = normalizeSearchText(character)
    for (let k = 0; k < normalized.length; k++) {
      originalStart.push(index)
      originalEnd.push(index + character.length)
    }
    normalizedText += normalized
    index += character.length
  }
  const toOriginal = (start: number, end: number): MatchChunk => ({
    start: originalStart[start],
    end: originalEnd[end - 1],
  })

  const words = wordsOf(normalizedText)
  const chunks: MatchChunk[] = []
  for (const token of tokens) {
    let position = normalizedText.indexOf(token)
    if (position !== -1) {
      while (position !== -1) {
        chunks.push(toOriginal(position, position + token.length))
        position = normalizedText.indexOf(token, position + token.length)
      }
    } else if (token.length >= MIN_TYPO_TOKEN_LENGTH) {
      for (const word of words) {
        if (typoScore(token, word.value) > 0) {
          chunks.push(toOriginal(word.start, word.end))
        }
      }
    }
  }
  return chunks.sort((a, b) => a.start - b.start)
}
