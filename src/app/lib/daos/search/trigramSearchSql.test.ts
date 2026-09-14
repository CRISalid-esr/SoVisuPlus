/**
 * @jest-environment node
 */
import { Prisma } from '@prisma/client'
import {
  buildTokenMatch,
  escapeLike,
  withWordSimilarityThreshold,
} from './trigramSearchSql'

const column = Prisma.sql`p."normalizedName"`

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b')
  })
})

describe('buildTokenMatch', () => {
  it('combines substring and trigram matching for long tokens', () => {
    const { where } = buildTokenMatch(column, ['dupont', 'jean'])
    expect(where.sql).toBe(
      '(p."normalizedName" LIKE ? OR ? <% p."normalizedName") AND ' +
        '(p."normalizedName" LIKE ? OR ? <% p."normalizedName")',
    )
    expect(where.values).toEqual(['%dupont%', 'dupont', '%jean%', 'jean'])
  })

  it('only uses substring matching for short tokens', () => {
    const { where } = buildTokenMatch(column, ['jo'])
    expect(where.sql).toBe('p."normalizedName" LIKE ?')
    expect(where.values).toEqual(['%jo%'])
  })

  it('escapes wildcards in patterns', () => {
    const { where } = buildTokenMatch(column, ['a_b'])
    expect(where.values[0]).toBe('%a\\_b%')
  })

  it('sums one score per token', () => {
    const { score } = buildTokenMatch(column, ['dupont', 'jean'])
    expect(score.sql.match(/CASE/g)).toHaveLength(2)
    expect(score.sql).toContain(' + ')
    expect(score.values).toEqual([
      '(^|[^[:alnum:]])dupont($|[^[:alnum:]])',
      '(^|[^[:alnum:]])dupont',
      '%dupont%',
      'dupont',
      '(^|[^[:alnum:]])jean($|[^[:alnum:]])',
      '(^|[^[:alnum:]])jean',
      '%jean%',
      'jean',
    ])
  })
})

describe('withWordSimilarityThreshold', () => {
  it('sets the threshold first in the same transaction', async () => {
    const queryRaw = jest.fn().mockReturnValue('set-threshold')
    const transaction = jest
      .fn()
      .mockResolvedValue(['threshold', [{ id: 1 }], [{ total: 1 }]])
    const prismaClient = {
      $queryRaw: queryRaw,
      $transaction: transaction,
    } as unknown as Parameters<typeof withWordSimilarityThreshold>[0]
    const first = 'first' as unknown as Prisma.PrismaPromise<unknown>
    const second = 'second' as unknown as Prisma.PrismaPromise<unknown>

    const results = await withWordSimilarityThreshold(prismaClient, [
      first,
      second,
    ])

    expect(transaction).toHaveBeenCalledWith(['set-threshold', first, second])
    expect(queryRaw.mock.calls[0][0].join('?')).toContain(
      "set_config('pg_trgm.word_similarity_threshold'",
    )
    expect(queryRaw.mock.calls[0][1]).toBe('0.6')
    expect(results).toEqual([[{ id: 1 }], [{ total: 1 }]])
  })
})
