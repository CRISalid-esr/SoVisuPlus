/**
 * A structure with a HAL collection, as seen from a perspective:
 * the structure itself for a research unit, its current memberships for a person.
 */
export type HalCollectionUnit = {
  acronym: string | null
  halCollection: string
}

/** Label shown to users: the acronym, the collection code as a fallback. */
export const halCollectionUnitLabel = (unit: HalCollectionUnit): string =>
  unit.acronym ?? unit.halCollection
