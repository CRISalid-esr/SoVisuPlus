import { Document } from '@/types/Document'

/** Org identifier types HAL recognises for an affiliation (RNSR/ROR/ISNI/IdRef). */
const HAL_RECOGNISED = new Set(['nns', 'ror', 'isni', 'idref'])

/** True when at least one author has an affiliation carrying a HAL-recognised identifier. */
export const hasHalRecognisedAffiliation = (document: Document): boolean =>
  (document.contributions ?? []).some((contribution) =>
    contribution.affiliations.some((org) =>
      org.identifiers.some(
        (id) => HAL_RECOGNISED.has(id.type) && !!id.value?.trim(),
      ),
    ),
  )
