/** Tokens shorter than this only match as substrings (no typo tolerance). */
export const MIN_TYPO_TOKEN_LENGTH = 4

/** Tokens at least this long tolerate two edits instead of one. */
export const TWO_EDITS_TOKEN_LENGTH = 7

/** Minimum trigram similarity between a token and a word to count as a match. */
export const WORD_VARIANT_SIMILARITY_THRESHOLD = 0.5

/** Extra tokens beyond this limit are ignored. */
export const MAX_SEARCH_TOKENS = 6
