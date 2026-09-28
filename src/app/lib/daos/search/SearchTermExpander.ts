import { PrismaClient } from '@prisma/client'
import {
  MAX_EXPANSION_CANDIDATE_ROWS,
  MAX_VARIANTS_PER_TOKEN,
  MIN_EXPANSION_TOKEN_LENGTH,
  MIN_TRIGRAM_TOKEN_LENGTH,
  WORD_VARIANT_SIMILARITY_THRESHOLD,
} from '@/utils/fuzzySearch/constants'
import {
  escapeLike,
  wholeWordRegex,
  withWordSimilarityThreshold,
} from '@/lib/daos/search/trigramSearchSql'

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX_ENTRIES = 1000

// Shared by every request of the process: the list and count queries of a
// same search, and repeated searches, look up each word once.
const cache = new Map<string, { variants: string[]; expiresAt: number }>()

const isExpandable = (token: string) =>
  token.length >= MIN_EXPANSION_TOKEN_LENGTH &&
  // numbers (years, volumes…) have no meaningful typo variants
  !/\d/.test(token)

/**
 * Typo variants of normalized search words, taken from the words that
 * actually occur in document titles, journal titles and people names: a
 * mistyped "learnng" expands to "learning". The document query can then stay
 * a plain Prisma where clause (`contains` any variant) and keep its
 * composition with the other filters, paging, sorting and count.
 *
 * Only likely typos are expanded: a word that occurs as such in the data
 * keeps no variants, so "economie" does not also match "economics". Every
 * token maps to itself first; short or numeric tokens are not expanded.
 */
export const expandSearchTokens = async (
  prismaClient: PrismaClient,
  tokens: string[],
): Promise<Map<string, string[]>> => {
  const now = Date.now()
  const expansions = new Map<string, string[]>()
  const toLookUp: string[] = []
  for (const token of new Set(tokens)) {
    const cached = cache.get(token)
    if (!isExpandable(token)) {
      expansions.set(token, [token])
    } else if (cached && cached.expiresAt > now) {
      expansions.set(token, cached.variants)
    } else {
      toLookUp.push(token)
    }
  }
  if (toLookUp.length === 0) {
    return expansions
  }

  // Candidate rows use the looser variant threshold: a typo inside a word
  // ("politque") has a lower word similarity than a typo at its end
  const likePatterns = toLookUp.map((token) => `%${escapeLike(token)}%`)
  const wordRegexes = toLookUp.map(wholeWordRegex)
  const [rows] = await withWordSimilarityThreshold(
    prismaClient,
    [
      prismaClient.$queryRaw<{ token: string; word: string }[]>`
      WITH tokens AS (
        SELECT * FROM unnest(
          ${toLookUp}::text[], ${likePatterns}::text[], ${wordRegexes}::text[]
        ) AS t(token, like_pattern, word_regex)
      ),
      -- A word that really occurs is not a typo, so it gets no variants
      -- ("economie" must not also match "economics"). Checked against the
      -- whole corpus: the candidate sample below is capped and would answer
      -- this by luck. The LIKE prefilter is served by the GIN trigram
      -- indexes; the regex then applies the word boundary.
      pending AS (
        SELECT * FROM tokens t
        WHERE NOT EXISTS (
          SELECT 1 FROM "DocumentTitle" d
            WHERE d."normalizedValue" LIKE t.like_pattern
              AND d."normalizedValue" ~ t.word_regex
          UNION ALL
          SELECT 1 FROM "Journal" j
            WHERE j."normalizedTitle" LIKE t.like_pattern
              AND j."normalizedTitle" ~ t.word_regex
          UNION ALL
          SELECT 1 FROM "Person" p
            WHERE p."normalizedName" LIKE t.like_pattern
              AND p."normalizedName" ~ t.word_regex
        )
      )
      SELECT t.token, v.word
      FROM pending t
      CROSS JOIN LATERAL (
        WITH words AS (
          SELECT regexp_split_to_table(c.txt, '[^[:alnum:]]+') AS word
          FROM (
            -- ordered so the capped sample is the closest rows rather than
            -- an arbitrary ones, which made the variants non-reproducible
            (SELECT "normalizedValue" AS txt FROM "DocumentTitle"
              WHERE "normalizedValue" %> t.token
              ORDER BY word_similarity(t.token, "normalizedValue") DESC
              LIMIT ${MAX_EXPANSION_CANDIDATE_ROWS})
            UNION ALL
            (SELECT "normalizedTitle" FROM "Journal"
              WHERE "normalizedTitle" %> t.token
              ORDER BY word_similarity(t.token, "normalizedTitle") DESC
              LIMIT ${MAX_EXPANSION_CANDIDATE_ROWS})
            UNION ALL
            (SELECT "normalizedName" FROM "Person"
              WHERE "normalizedName" %> t.token
              ORDER BY word_similarity(t.token, "normalizedName") DESC
              LIMIT ${MAX_EXPANSION_CANDIDATE_ROWS})
          ) c
        )
        SELECT w.word
        FROM words w
        WHERE length(w.word) >= ${MIN_TRIGRAM_TOKEN_LENGTH}
        GROUP BY w.word
        HAVING similarity(w.word, t.token) >= ${WORD_VARIANT_SIMILARITY_THRESHOLD}
        ORDER BY similarity(w.word, t.token) DESC, count(*) DESC, w.word
        LIMIT ${MAX_VARIANTS_PER_TOKEN}
      ) v`,
    ],
    WORD_VARIANT_SIMILARITY_THRESHOLD,
  )

  const variantsByToken = new Map(
    toLookUp.map((token) => [token, [token]] as [string, string[]]),
  )
  for (const row of rows) {
    variantsByToken.get(row.token)?.push(row.word)
  }
  for (const [token, variants] of variantsByToken) {
    expansions.set(token, variants)
    if (cache.size >= CACHE_MAX_ENTRIES) {
      // Map keeps insertion order: drop the oldest entry
      cache.delete(cache.keys().next().value!)
    }
    cache.set(token, { variants, expiresAt: now + CACHE_TTL_MS })
  }
  return expansions
}

/** For tests only. */
export const clearSearchTokenExpansionCache = () => cache.clear()
