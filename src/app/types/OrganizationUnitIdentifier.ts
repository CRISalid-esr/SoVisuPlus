import { OrganizationIdentifierType as DbOrganizationIdentifierType } from '@prisma/client'

export type OrganizationUnitIdentifier = {
  type: DbOrganizationIdentifierType
  value: string
}

/**
 * Convert a string to a valid OrganizationIdentifierType or throw error if not valid
 * @param typeString - The string representation of the organization identifier type
 * @returns A valid OrganizationIdentifierType
 */
export const organizationIdentifierTypeFromString = (
  typeString: string,
): DbOrganizationIdentifierType => {
  const convertedType = typeString as DbOrganizationIdentifierType
  const isValid = Object.values(DbOrganizationIdentifierType).includes(
    convertedType,
  )
  if (!isValid) {
    throw new Error(`Unsupported identifier type: ${typeString}`)
  }
  return convertedType
}

export { DbOrganizationIdentifierType as OrganizationIdentifierType }
