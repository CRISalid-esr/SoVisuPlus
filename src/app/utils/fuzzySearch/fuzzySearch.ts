import removeAccents from 'remove-accents'
import {
  MAX_DOCUMENT_SEARCH_TOKENS,
  MIN_TRIGRAM_TOKEN_LENGTH,
  MAX_SEARCH_TOKEN_LENGTH,
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
 * Case- and diacritics-insensitive form used for every search comparison,
 * on both the query and the stored `normalized*` columns.
 *
 * Decomposes first and drops the combining marks (U+0300-U+036F), then lets
 * `remove-accents` handle what decomposition cannot: precomposed letters with
 * no combining form (`ł`, `ø`) and ligatures (`œ` becomes `oe`). Both halves
 * are needed — source data is not always precomposed, and `remove-accents` is
 * a Latin lookup table that leaves a decomposed `e` + U+0301 untouched.
 *
 * Dropping the marks also matters for tokenizing: neither `\p{L}` nor POSIX
 * `[:alnum:]` matches a combining mark, so a value still carrying one splits
 * mid-word (`ame` + `riques`) on either side of the search.
 */
export const normalizeSearchText = (value: string): string =>
  removeAccents(
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  ).toLowerCase()

const wordsOf = (normalizedText: string): Word[] =>
  Array.from(normalizedText.matchAll(wordPattern()), (match) => ({
    value: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))

/**
 * Distinct normalized words of a query, capped to `maxTokens` words of at
 * most MAX_SEARCH_TOKEN_LENGTH characters.
 */
export const tokenizeSearchQuery = (
  query: string,
  maxTokens: number = MAX_SEARCH_TOKENS,
): string[] =>
  [
    ...new Set(
      wordsOf(normalizeSearchText(query)).map((word) =>
        word.value.slice(0, MAX_SEARCH_TOKEN_LENGTH),
      ),
    ),
  ].slice(0, maxTokens)

/**
 * Words of a documents list search: up to MAX_DOCUMENT_SEARCH_TOKENS words so
 * that a pasted title is used whole. Words shorter than
 * MIN_TRIGRAM_TOKEN_LENGTH ("de", "a", "1"…) are ignored when longer ones
 * exist: they match almost every document and cannot use the trigram
 * indexes.
 */
export const tokenizeDocumentSearchQuery = (query: string): string[] => {
  const tokens = tokenizeSearchQuery(query, MAX_DOCUMENT_SEARCH_TOKENS)
  const meaningful = tokens.filter(
    (token) => token.length >= MIN_TRIGRAM_TOKEN_LENGTH,
  )
  return meaningful.length > 0 ? meaningful : tokens
}

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

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) {
    return 0
  }
  let shared = 0
  for (const trigram of a) {
    if (b.has(trigram)) {
      shared++
    }
  }
  return shared / (a.size + b.size - shared)
}

/** Jaccard similarity of trigram sets, as pg_trgm `similarity()`. */
export const trigramSimilarity = (a: string, b: string): number =>
  jaccard(
    trigramsOf(normalizeSearchText(a)),
    trigramsOf(normalizeSearchText(b)),
  )

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

/**
 * A query token with the per-token work done once: its edit budget and its
 * trigram set do not depend on the text being scored, so they are hoisted out
 * of the loop over candidate rows.
 */
interface PreparedToken {
  value: string
  maxEdits: number
  trigrams: Set<string>
}

const prepareToken = (value: string): PreparedToken => ({
  value,
  maxEdits: value.length >= TWO_EDITS_TOKEN_LENGTH ? 2 : 1,
  trigrams: trigramsOf(value),
})

/** Typo score of a prepared token against a single word, 0 when too different. */
const typoScoreOf = (
  token: PreparedToken,
  word: string,
  wordTrigrams: (word: string) => Set<string>,
): number => {
  const { value, maxEdits } = token
  const distance = osaDistance(value, word, maxEdits)
  if (distance <= maxEdits) {
    return 0.7 - 0.1 * distance
  }
  // The user may still be typing: compare with the word's beginning (not for
  // the shortest tokens, whose one-edit prefixes match far too many words)
  if (word.length > value.length && value.length > MIN_TYPO_TOKEN_LENGTH) {
    const prefixDistance = osaDistance(
      value,
      word.slice(0, value.length),
      maxEdits,
    )
    if (prefixDistance <= maxEdits) {
      return 0.6 - 0.1 * prefixDistance
    }
  }
  const similarity = jaccard(token.trigrams, wordTrigrams(word))
  return similarity >= WORD_VARIANT_SIMILARITY_THRESHOLD ? 0.6 * similarity : 0
}

/** Typo score of a single token against a single word, both normalized. */
const typoScore = (token: string, word: string): number =>
  typoScoreOf(prepareToken(token), word, trigramsOf)

/**
 * Score (0..1) of a normalized token against a normalized text: exact word
 * 1, word prefix 0.9, substring 0.8, then typo-tolerant word matches for
 * tokens of at least MIN_TYPO_TOKEN_LENGTH characters.
 */
const scoreToken = (
  token: PreparedToken,
  normalizedText: string,
  words: Word[],
  wordTrigrams: (word: string) => Set<string>,
) => {
  const { value } = token
  if (words.some((word) => word.value === value)) return 1
  if (words.some((word) => word.value.startsWith(value))) return 0.9
  if (normalizedText.includes(value)) return 0.8
  if (value.length < MIN_TYPO_TOKEN_LENGTH) return 0
  return Math.max(
    0,
    ...words.map((word) => typoScoreOf(token, word.value, wordTrigrams)),
  )
}

/** Texts a scorer can be applied to; falsy entries are ignored. */
type ScorableTexts = string | (string | null | undefined)[]

/**
 * Prepare a query once, then score many candidates against it.
 *
 * Use this over `fuzzyScore` whenever a single query is applied to a list —
 * filtering a members table or a tree — since it tokenizes the query and
 * builds each token's trigram set once instead of per candidate. It runs
 * synchronously on the Node event loop server-side, so the work it saves is
 * not just allocations: it is time no other request can use.
 */
export const createFuzzyScorer = (
  query: string,
): ((texts: ScorableTexts) => number) => {
  const tokens = tokenizeSearchQuery(query).map(prepareToken)
  if (tokens.length === 0) {
    // an empty query matches everything
    return () => 1
  }
  return (texts: ScorableTexts) => {
    const normalizedText = (Array.isArray(texts) ? texts : [texts])
      .filter((text): text is string => !!text)
      .map(normalizeSearchText)
      .join(' ')
    const words = wordsOf(normalizedText)
    // a word repeated across the given texts is only expanded once
    const trigramCache = new Map<string, Set<string>>()
    const wordTrigrams = (word: string): Set<string> => {
      const cached = trigramCache.get(word)
      if (cached) return cached
      const trigrams = trigramsOf(word)
      trigramCache.set(word, trigrams)
      return trigrams
    }
    let total = 0
    for (const token of tokens) {
      const score = scoreToken(token, normalizedText, words, wordTrigrams)
      if (score === 0) {
        return 0
      }
      total += score
    }
    return total / tokens.length
  }
}

/**
 * Relevance (0..1) of a free-text query against one or several texts. Every
 * query word must match one of the texts (in any order), otherwise 0. An
 * empty query matches everything with score 1.
 *
 * Scoring a list against one query? Use createFuzzyScorer instead.
 */
export const fuzzyScore = (query: string, texts: ScorableTexts): number =>
  createFuzzyScorer(query)(texts)

export const fuzzyMatch = (query: string, texts: ScorableTexts): boolean =>
  fuzzyScore(query, texts) > 0

/**
 * Ranges of `text` (original indexes) matched by `query`, for
 * react-highlight-words `findChunks`. Substring matches highlight the exact
 * characters; typo matches highlight the whole word. Overlapping chunks and
 * chunks separated only by whitespace are merged, so "John Doe" is
 * highlighted as one range.
 */
export const findFuzzyMatchChunks = (
  text: string,
  query: string,
  tokenize: (query: string) => string[] = tokenizeSearchQuery,
): MatchChunk[] => {
  const tokens = tokenize(query)
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
  return mergeChunks(chunks, text)
}

/**
 * Sort and coalesce chunks, joining those separated only by whitespace so
 * "John Doe" highlights as one range. react-highlight-words needs the result
 * ordered and non-overlapping.
 */
const mergeChunks = (chunks: MatchChunk[], text: string): MatchChunk[] => {
  const merged: MatchChunk[] = []
  for (const chunk of [...chunks].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1]
    if (last && text.slice(last.end, chunk.start).trim() === '') {
      last.end = Math.max(last.end, chunk.end)
    } else {
      merged.push({ ...chunk })
    }
  }
  return merged
}

/**
 * react-highlight-words `findChunks` for the documents list: highlights the
 * words of all the given searches (global search and column filter) the way
 * the documents search matches them, typos included.
 *
 * Each search is tokenized on its own, then the chunks are merged. Joining
 * them into one string first would let one search change how another is
 * tokenized, because tokenizeDocumentSearchQuery only drops words shorter
 * than MIN_TRIGRAM_TOKEN_LENGTH when longer ones exist: a global search for
 * "IA" next to a title filter "learning" would silently stop highlighting
 * "IA", although the server matched the two filters independently.
 */
export const findDocumentSearchChunks = ({
  searchWords,
  textToHighlight,
}: {
  searchWords: (string | RegExp)[]
  textToHighlight: string
}): MatchChunk[] =>
  mergeChunks(
    searchWords
      .filter((word): word is string => typeof word === 'string')
      .flatMap((search) =>
        findFuzzyMatchChunks(
          textToHighlight,
          search,
          tokenizeDocumentSearchQuery,
        ),
      ),
    textToHighlight,
  )
