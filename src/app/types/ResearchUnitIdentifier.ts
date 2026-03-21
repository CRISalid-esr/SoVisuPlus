import { ResearchUnitIdentifierType as DbResearchUnitIdentifierType } from '@prisma/client'

export type ResearchUnitIdentifier = {
  type: DbResearchUnitIdentifierType
  value: string
}

/**
 * Convert a string to a valid ResearchUnitIdentifierType or throw error if not valid
 * @param typeString - The string representation of the research unit identifier type
 * @returns A valid ResearchUnitIdentifierType
 */
export const researchUnitIdentifierTypeFromString = (
  typeString: string,
): DbResearchUnitIdentifierType => {
  const convertedType = typeString as DbResearchUnitIdentifierType
  const isValid = Object.values(DbResearchUnitIdentifierType).includes(
    convertedType,
  )
  if (!isValid) {
    throw new Error(`Unsupported identifier type: ${typeString}`)
  }
  return convertedType
}

export { DbResearchUnitIdentifierType as ResearchUnitIdentifierType }
