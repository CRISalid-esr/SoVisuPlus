import process from 'node:process'
import { SearchColumnsService } from '@/lib/services/SearchColumnsService'

/**
 * Idempotently fill the normalized search columns of rows written before
 * they existed (fuzzy search). A no-op once every row is filled.
 */
const main = async () => {
  const updated =
    await new SearchColumnsService().backfillNormalizedSearchColumns()
  console.log(
    `[backfill_search_columns] Done — updated ${updated.people} people, ${updated.organizationUnits} organization unit rows, ${updated.documents} document rows.`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill_search_columns] Failed:', err?.message ?? err)
  process.exit(1)
})
