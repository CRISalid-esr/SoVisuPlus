/**
 * Loads every row of a query page by page (cursor pagination on `id`).
 *
 * Prisma loads nested relations with `WHERE parentId IN (...)`, one bind
 * variable per parent row: an unpaginated query over a large perimeter goes
 * past PostgreSQL's 32767 bind variables limit. Paging keeps each query small.
 *
 * `fetchPage` must order by `id` ascending and apply
 * `take: batchSize` plus, when `cursorId` is set, `cursor: { id: cursorId }, skip: 1`.
 */
export const DEFAULT_BATCH_SIZE = 1000

export async function fetchInBatches<T extends { id: number }>(
  fetchPage: (cursorId: number | undefined, batchSize: number) => Promise<T[]>,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<T[]> {
  const rows: T[] = []
  let cursorId: number | undefined
  for (;;) {
    const page = await fetchPage(cursorId, batchSize)
    rows.push(...page)
    if (page.length < batchSize) return rows
    cursorId = page[page.length - 1].id
  }
}

/** Prisma pagination arguments matching {@link fetchInBatches}. */
export const batchPageArgs = (
  cursorId: number | undefined,
  batchSize: number,
) => ({
  orderBy: { id: 'asc' as const },
  take: batchSize,
  ...(cursorId !== undefined && { cursor: { id: cursorId }, skip: 1 }),
})
