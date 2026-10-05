import { Prisma } from '@prisma/client'
import prisma from '@/lib/daos/prisma'
import {
  buildTokenMatch,
  withWordSimilarityThreshold,
} from '@/lib/daos/search/trigramSearchSql'
import {
  fuzzyScore,
  normalizeSearchText,
  tokenizeSearchQuery,
} from '@/utils/fuzzySearch/fuzzySearch'

/**
 * The client ranks with `fuzzyScore` and PostgreSQL ranks with the CASE in
 * `buildTokenMatch`. They are two implementations of one ladder — whole word
 * 1, word prefix 0.9, substring 0.8, then a typo tier below that — and
 * nothing in the code links them, so tuning one silently desynchronises
 * client ranking, server ranking and highlighting.
 *
 * This pins the tiers, not the exact typo values: the typo tier is scored
 * differently on each side by design (edit distance in TS, word_similarity in
 * pg_trgm), so it is asserted to be strictly between 0 and the substring tier.
 */

const WHOLE_WORD = 1
const WORD_PREFIX = 0.9
const SUBSTRING = 0.8

/** The score PostgreSQL gives `token` against `text`, both normalized. */
const sqlScore = async (token: string, text: string): Promise<number> => {
  const match = buildTokenMatch(Prisma.sql`${text}::text`, [token])
  const [rows] = await withWordSimilarityThreshold(prisma, [
    prisma.$queryRaw<
      { score: number }[]
    >`SELECT ${match.score}::float8 AS score`,
  ])
  return Number(rows[0].score)
}

/** The score the browser gives the same pair. */
const tsScore = (token: string, text: string): number => fuzzyScore(token, text)

describe('fuzzyScore and buildTokenMatch agree on the score ladder', () => {
  const text = normalizeSearchText('Institut des sciences juridiques')

  it.each([
    ['whole word', 'sciences', WHOLE_WORD],
    ['word prefix', 'scien', WORD_PREFIX],
    // "urid" starts no word but occurs inside "juridiques"
    ['substring', 'urid', SUBSTRING],
  ])('scores a %s the same on both sides', async (_label, token, expected) => {
    expect(tsScore(token, text)).toBeCloseTo(expected, 5)
    expect(await sqlScore(token, text)).toBeCloseTo(expected, 5)
  })

  it('puts a typo below the substring tier on both sides, but above zero', async () => {
    const token = 'sciense' // one transposition away from "sciences"
    const ts = tsScore(token, text)
    const sql = await sqlScore(token, text)
    expect(ts).toBeGreaterThan(0)
    expect(ts).toBeLessThan(SUBSTRING)
    expect(sql).toBeGreaterThan(0)
    expect(sql).toBeLessThan(SUBSTRING)
  })

  it('orders the tiers identically on both sides', async () => {
    const tokens = ['sciences', 'scien', 'urid', 'sciense']
    const ts = tokens.map((token) => tsScore(token, text))
    const sql = await Promise.all(tokens.map((token) => sqlScore(token, text)))
    const descending = (scores: number[]) =>
      scores.every((score, i) => i === 0 || scores[i - 1] >= score)
    expect(descending(ts)).toBe(true)
    expect(descending(sql)).toBe(true)
  })

  // the SQL score sums over tokens while fuzzyScore averages, so only the
  // per-token tier is comparable — guard the assumption that they tokenize alike
  it('tokenizes a multi-word query the same way before scoring', () => {
    expect(tokenizeSearchQuery('Institut, JURIDIQUES institut')).toEqual([
      'institut',
      'juridiques',
    ])
  })
})
