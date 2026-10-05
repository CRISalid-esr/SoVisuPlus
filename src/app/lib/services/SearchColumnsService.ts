import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'

/**
 * Maintenance of the search-only normalized columns (lowercase, no
 * diacritics) used by fuzzy search. They are set on every write; the backfill
 * covers rows written before the columns existed.
 */
export class SearchColumnsService {
  async backfillNormalizedSearchColumns(batchSize?: number): Promise<{
    people: number
    organizationUnits: number
    documents: number
  }> {
    return {
      people: await new PersonDAO().backfillNormalizedSearchColumns(batchSize),
      organizationUnits:
        await new OrganizationUnitDAO().backfillNormalizedSearchColumns(
          batchSize,
        ),
      documents: await new DocumentDAO().backfillNormalizedSearchColumns(
        batchSize,
      ),
    }
  }
}
