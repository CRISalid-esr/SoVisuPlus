import { Prisma } from '@prisma/client'
import { DbClient, isPrismaClient } from '@/lib/daos/AbstractDAO'
import { normalizeSearchText } from '@/utils/fuzzySearch/fuzzySearch'

export const DEFAULT_BACKFILL_BATCH_SIZE = 500

/**
 * Fill a search-only normalized column for the rows still missing it, one
 * batch at a time. `fetchBatch` must only return rows whose normalized column
 * is null, so that each batch makes progress and the loop terminates.
 * Returns the number of updated rows.
 */
export const backfillNormalizedColumn = async (
  prismaClient: DbClient,
  fetchBatch: (take: number) => Promise<{ id: number; source: string }[]>,
  updateRow: (id: number, normalized: string) => Prisma.PrismaPromise<unknown>,
  batchSize: number = DEFAULT_BACKFILL_BATCH_SIZE,
): Promise<number> => {
  let updated = 0
  for (;;) {
    const rows = await fetchBatch(batchSize)
    if (rows.length === 0) {
      return updated
    }
    const updates = rows.map((row) =>
      updateRow(row.id, normalizeSearchText(row.source)),
    )
    if (isPrismaClient(prismaClient)) {
      await prismaClient.$transaction(updates)
    } else {
      // Already inside a transaction: the batch joins it
      for (const update of updates) {
        await update
      }
    }
    updated += rows.length
  }
}
