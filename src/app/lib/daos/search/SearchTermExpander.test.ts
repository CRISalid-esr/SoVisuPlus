/**
 * @jest-environment node
 */
import {
  clearSearchTokenExpansionCache,
  expandSearchTokens,
} from './SearchTermExpander'

const makePrisma = (rows: { token: string; word: string }[]) => {
  const queryRaw = jest.fn().mockReturnValue('query')
  const transaction = jest.fn().mockResolvedValue(['threshold', rows])
  return {
    prismaClient: {
      $queryRaw: queryRaw,
      $transaction: transaction,
    } as unknown as Parameters<typeof expandSearchTokens>[0],
    queryRaw,
    transaction,
  }
}

describe('expandSearchTokens', () => {
  beforeEach(() => {
    clearSearchTokenExpansionCache()
  })

  it('maps each token to itself first, then its variants', async () => {
    const { prismaClient } = makePrisma([
      { token: 'learnng', word: 'learning' },
      { token: 'learnng', word: 'learnt' },
    ])

    const expansions = await expandSearchTokens(prismaClient, [
      'learnng',
      'politique',
    ])

    expect(expansions.get('learnng')).toEqual(['learnng', 'learning', 'learnt'])
    expect(expansions.get('politique')).toEqual(['politique'])
  })

  it('does not look up short or numeric tokens', async () => {
    const { prismaClient, transaction } = makePrisma([])

    const expansions = await expandSearchTokens(prismaClient, [
      'cnr',
      '2020',
      'hal2',
    ])

    expect(transaction).not.toHaveBeenCalled()
    expect(expansions.get('cnr')).toEqual(['cnr'])
    expect(expansions.get('2020')).toEqual(['2020'])
    expect(expansions.get('hal2')).toEqual(['hal2'])
  })

  it('looks up only the uncached tokens, once per distinct token', async () => {
    const first = makePrisma([{ token: 'climat', word: 'climate' }])
    await expandSearchTokens(first.prismaClient, ['climat', 'climat'])
    expect(first.queryRaw.mock.calls[0][1]).toEqual(['climat'])

    const second = makePrisma([{ token: 'urbain', word: 'urbaine' }])
    const expansions = await expandSearchTokens(second.prismaClient, [
      'climat',
      'urbain',
    ])

    expect(second.queryRaw.mock.calls[0][1]).toEqual(['urbain'])
    expect(expansions.get('climat')).toEqual(['climat', 'climate'])
    expect(expansions.get('urbain')).toEqual(['urbain', 'urbaine'])
  })

  it('does not query when every token is cached', async () => {
    await expandSearchTokens(makePrisma([]).prismaClient, ['climat'])
    const { prismaClient, transaction } = makePrisma([])

    await expandSearchTokens(prismaClient, ['climat'])

    expect(transaction).not.toHaveBeenCalled()
  })
})
