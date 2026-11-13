import process from 'node:process'
import { IdentifierValidationSyncService } from '@/lib/services/IdentifierValidationSyncService'

/**
 * Align the local `validated` flag of person identifiers with the graph.
 * Run once after deploying the `validated` column; safe to re-run.
 */
const main = async () => {
  const { people, updated, failed } =
    await new IdentifierValidationSyncService().syncFromGraph()
  console.log(
    `[sync_identifiers_validation] Done — checked ${people} people, updated ${updated} identifiers, ${failed} failures.`,
  )
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[sync_identifiers_validation] Failed:', err?.message ?? err)
  process.exit(1)
})
