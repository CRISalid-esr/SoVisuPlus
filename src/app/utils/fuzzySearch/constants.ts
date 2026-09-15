/** Tokens shorter than this only match as substrings (no typo tolerance). */
export const MIN_TYPO_TOKEN_LENGTH = 4

/** Tokens at least this long tolerate two edits instead of one. */
export const TWO_EDITS_TOKEN_LENGTH = 7

/** Minimum trigram similarity between a token and a word to count as a match. */
export const WORD_VARIANT_SIMILARITY_THRESHOLD = 0.5

/** Extra tokens beyond this limit are ignored. */
export const MAX_SEARCH_TOKENS = 6

/**
 * Longer tokens are truncated: bounds the cost of similarity computations
 * (client-side and pg_trgm) for abusive inputs. No real word is this long.
 */
export const MAX_SEARCH_TOKEN_LENGTH = 100

/**
 * Server side (pg_trgm): minimum word_similarity for a token to match a
 * column without being a substring of it (`<%` operator threshold).
 */
export const WORD_SIMILARITY_THRESHOLD = 0.6

/** Server side: tokens shorter than this only match as substrings. */
export const MIN_TRIGRAM_TOKEN_LENGTH = 3

/**
 * Documents list search: word limit, higher than for names so that a pasted
 * title is matched on most of its words.
 */
export const MAX_DOCUMENT_SEARCH_TOKENS = 30

/** Documents search: minimum length of a word looked up for typo variants. */
export const MIN_EXPANSION_TOKEN_LENGTH = 4

/** Documents search: maximum number of typo variants kept per word (besides the word itself). */
export const MAX_VARIANTS_PER_TOKEN = 5

/**
 * Documents search: rows scanned per source (titles, journals, people) when
 * looking up the typo variants of a word.
 */
export const MAX_EXPANSION_CANDIDATE_ROWS = 200
