import { AbstractDAO, DbClient, isPrismaClient } from '@/lib/daos/AbstractDAO'
import prisma from '@/lib/daos/prisma'

jest.mock('@/lib/daos/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn('singleton-tx'),
    ),
  },
}))

class TestDAO extends AbstractDAO {
  get bound(): DbClient {
    return this.prismaClient
  }
  get isInTransaction(): boolean {
    return this.inTransaction
  }
  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return this.transaction(fn)
  }
}

// A transaction client has no `$transaction`
const txClient = { person: {} } as unknown as DbClient

describe('AbstractDAO', () => {
  beforeEach(() => jest.clearAllMocks())

  it('binds to the Prisma singleton by default', () => {
    const dao = new TestDAO()
    expect(dao.bound).toBe(prisma)
    expect(dao.isInTransaction).toBe(false)
  })

  it('binds to an injected transaction client', () => {
    const dao = new TestDAO(txClient)
    expect(dao.bound).toBe(txClient)
    expect(dao.isInTransaction).toBe(true)
  })

  it('transaction() opens a new transaction on the singleton', async () => {
    const dao = new TestDAO()
    const fn = jest.fn(async (tx: unknown) => tx)
    await expect(dao.run(fn)).resolves.toBe('singleton-tx')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('singleton-tx')
  })

  it('transaction() joins the transaction the DAO is bound to', async () => {
    const dao = new TestDAO(txClient)
    const fn = jest.fn(async (tx: unknown) => tx)
    await expect(dao.run(fn)).resolves.toBe(txClient)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(fn).toHaveBeenCalledWith(txClient)
  })

  it('isPrismaClient() tells the singleton from a transaction client', () => {
    expect(isPrismaClient(prisma)).toBe(true)
    expect(isPrismaClient(txClient)).toBe(false)
  })
})
