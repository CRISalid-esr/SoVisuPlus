import { ResearchStructureIdentifierType as DbResearchStructureIdentifierType } from '@prisma/client'

export type ResearchStructureIdentifier = {
  type: DbResearchStructureIdentifierType
  value: string
}

/**
 * Convert a string to a valid ResearchStructureIdentifierType or throw error if not valid
 * @param typeString - The string representation of the research structure identifier type
 * @returns A valid ResearchStructureIdentifierType
 */
export const researchStructureIdentifierTypeFromString = (
  typeString: string,
): DbResearchStructureIdentifierType => {
  const convertedType = typeString as DbResearchStructureIdentifierType
  const isValid = Object.values(DbResearchStructureIdentifierType).includes(
    convertedType,
  )
  if (!isValid) {
    throw new Error(`Unsupported identifier type: ${typeString}`)
  }
  return convertedType
}

export { DbResearchStructureIdentifierType as ResearchStructureIdentifierType }
