import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'

const VALID_RANK: Record<string, number> = {
  VALID: 0,
  OLD: 1,
  INCOMING: 2,
}

const validRank = (doc: AureHalStructureDoc): number =>
  VALID_RANK[doc.valid_s ?? ''] ?? 3

export function countStructureIdentifiers(doc: AureHalStructureDoc): number {
  return [
    doc.ror_s,
    doc.idref_s,
    doc.isni_s,
    doc.rnsr_s,
    doc.wikidata_s,
  ].filter((arr) => arr && arr.length > 0).length
}

/**
 * Order HAL structure results: by validity (VALID, OLD, INCOMING), then results
 * with a ROR first, then by descending identifier count.
 */
export function orderStructureDocs(
  docs: AureHalStructureDoc[],
): AureHalStructureDoc[] {
  return [...docs].sort((a, b) => {
    const validDiff = validRank(a) - validRank(b)
    if (validDiff !== 0) return validDiff

    const aHasRor = a.ror_s && a.ror_s.length > 0 ? 0 : 1
    const bHasRor = b.ror_s && b.ror_s.length > 0 ? 0 : 1
    if (aHasRor !== bHasRor) return aHasRor - bHasRor

    return countStructureIdentifiers(b) - countStructureIdentifiers(a)
  })
}

/** Color/weight for a result's name based on its validity. */
export function structureValidityStyle(doc: AureHalStructureDoc): {
  color: string
  fontWeight: number
} {
  switch (doc.valid_s) {
    case 'VALID':
      return { color: 'success.main', fontWeight: 700 }
    case 'INCOMING':
      return { color: 'warning.dark', fontWeight: 700 }
    case 'OLD':
      return { color: 'warningYellow', fontWeight: 400 }
    default:
      return { color: 'text.primary', fontWeight: 400 }
  }
}
