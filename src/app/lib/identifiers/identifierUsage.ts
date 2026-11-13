import { PersonService } from '@/lib/services/PersonService'
import { PersonIdentifier } from '@/types/PersonIdentifier'

/**
 * Adds `usedByAnotherPerson` to an identifier preview (ORCID, IdRef, idHAL),
 * so the user is warned before adding an identifier that belongs to someone
 * else. Whether an identifier is taken is not sensitive: it is computed for any
 * caller, as long as the target person is given; otherwise the preview is
 * returned as is.
 */
export const withIdentifierUsage = async <T extends object>(
  preview: T,
  personUid: string | null | undefined,
  identifiers: PersonIdentifier[],
): Promise<T & { usedByAnotherPerson?: boolean }> => {
  if (!personUid) return preview
  const usedByAnotherPerson =
    await new PersonService().isAnyIdentifierUsedByAnotherPerson(
      personUid,
      identifiers,
    )
  return { ...preview, usedByAnotherPerson }
}
