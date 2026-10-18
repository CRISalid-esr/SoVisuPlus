import prisma from '@/lib/daos/prisma'
import { DbClient } from '@/lib/daos/AbstractDAO'

/**
 * Run `fn` inside one database transaction. The callback receives a client to
 * hand to DAO constructors so that every call of those DAOs, across DAOs,
 * commits or rolls back together:
 *
 * ```ts
 * await runInTransaction(async (tx) => {
 *   const personDAO = new PersonDAO(tx)
 *   const actionDAO = new ActionDAO(tx)
 *   await personDAO.upsertIdentifier(identifier, personUid)
 *   await actionDAO.createAction({ ... })
 * })
 * ```
 *
 * Services use this instead of touching Prisma. Nesting `runInTransaction`
 * calls is not supported: the inner call would open a second, independent
 * transaction. Build the tx-bound DAOs at the outermost level.
 *
 * @param fn - Callback receiving the transaction client
 * @param options - Prisma interactive-transaction options (`maxWait`, `timeout`)
 */
export function runInTransaction<T>(
  fn: (tx: DbClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx), options)
}
