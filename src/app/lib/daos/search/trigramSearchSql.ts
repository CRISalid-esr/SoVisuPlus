import { Prisma, PrismaClient } from '@prisma/client'
import {
  MIN_TRIGRAM_TOKEN_LENGTH,
  WORD_SIMILARITY_THRESHOLD,
} from '@/utils/fuzzySearch/constants'

/** Escape LIKE wildcards; the default LIKE escape character is backslash. */
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`)

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, (character) => `\\${character}`)

/**
 * SQL fragments matching normalized search tokens against a normalized
 * column (lowercase, no diacritics), with pg_trgm typo tolerance.
 *
 * - `where`: every token must be a substring of the column or, for tokens of
 *   at least MIN_TRIGRAM_TOKEN_LENGTH characters, have a pg_trgm
 *   word_similarity with it above the `<%` threshold.
 * - `score`: sum over tokens of 1 (whole word), 0.9 (word prefix),
 *   0.8 (substring) or 0.7 × word_similarity (typo) — the same scale as the
 *   client-side fuzzyScore.
 *
 * `tokens` must not be empty (see tokenizeSearchQuery).
 */
export const buildTokenMatch = (
  column: Prisma.Sql,
  tokens: string[],
): { where: Prisma.Sql; score: Prisma.Sql } => {
  const conditions = tokens.map((token) => {
    const pattern = `%${escapeLike(token)}%`
    return token.length >= MIN_TRIGRAM_TOKEN_LENGTH
      ? Prisma.sql`(${column} LIKE ${pattern} OR ${token} <% ${column})`
      : Prisma.sql`${column} LIKE ${pattern}`
  })
  const scores = tokens.map((token) => {
    const pattern = `%${escapeLike(token)}%`
    const wordStart = `(^|[^[:alnum:]])${escapeRegex(token)}`
    const wholeWord = `${wordStart}($|[^[:alnum:]])`
    return Prisma.sql`(CASE
      WHEN ${column} ~ ${wholeWord} THEN 1.0
      WHEN ${column} ~ ${wordStart} THEN 0.9
      WHEN ${column} LIKE ${pattern} THEN 0.8
      ELSE 0.7 * word_similarity(${token}, ${column})
    END)`
  })
  return {
    where: Prisma.join(conditions, ' AND '),
    score: Prisma.sql`(${Prisma.join(scores, ' + ')})`,
  }
}

/**
 * Run raw queries in one transaction where the pg_trgm `<%` operator uses
 * WORD_SIMILARITY_THRESHOLD. The setting is local to the transaction.
 */
export const withWordSimilarityThreshold = async <
  T extends Prisma.PrismaPromise<unknown>[],
>(
  prismaClient: PrismaClient,
  queries: [...T],
): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
  const [, ...results] = await prismaClient.$transaction([
    prismaClient.$queryRaw`SELECT set_config('pg_trgm.word_similarity_threshold', ${String(WORD_SIMILARITY_THRESHOLD)}, true)`,
    ...queries,
  ])
  return results as { [K in keyof T]: Awaited<T[K]> }
}
