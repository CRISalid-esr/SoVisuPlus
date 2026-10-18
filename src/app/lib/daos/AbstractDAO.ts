import { Prisma, PrismaClient } from '@prisma/client'
import prisma from '@/lib/daos/prisma'

/**
 * A database client a DAO can be bound to: the Prisma singleton, or the client
 * handed to an interactive transaction callback (which lacks `$transaction`,
 * `$connect`, `$disconnect`…). Model queries compile unchanged against both.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient

export class AbstractDAO {
  protected prismaClient: DbClient
  /** true when this DAO is bound to an already-open transaction */
  protected readonly inTransaction: boolean

  /**
   * @param client - Database client to use. Defaults to the Prisma singleton.
   *   Pass the client received from `runInTransaction` to make every call of
   *   this DAO run inside that transaction.
   */
  constructor(client: DbClient = prisma) {
    this.prismaClient = client
    this.inTransaction = !isPrismaClient(client)
  }

  /**
   * Run `fn` in a transaction. Opens a new one when this DAO is bound to the
   * singleton, or joins the transaction this DAO is already bound to (Prisma
   * does not nest transactions).
   */
  protected transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (isPrismaClient(this.prismaClient)) {
      return this.prismaClient.$transaction(fn)
    }
    return fn(this.prismaClient)
  }
}

export function isPrismaClient(client: DbClient): client is PrismaClient {
  return '$transaction' in client
}
