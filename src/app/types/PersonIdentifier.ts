import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

type PersonIdentifier = {
  type: DbPersonIdentifierType
  value: string
}

const convertStringPersonIdentifierType = (
  type: string,
): DbPersonIdentifierType => {
  switch (type.trim().toLowerCase()) {
    case 'local':
      return DbPersonIdentifierType.LOCAL
    case 'orcid':
      return DbPersonIdentifierType.ORCID
    case 'idref':
      return DbPersonIdentifierType.IDREF
    case 'scopus_eid':
      return DbPersonIdentifierType.SCOPUS_EID
    case 'id_hal':
      return DbPersonIdentifierType.ID_HAL_S
    case 'id_hal_s':
      return DbPersonIdentifierType.ID_HAL_S
    default:
      throw new Error(`Unknown identifier type: ${type}`)
  }
}

export type { PersonIdentifier }
export { DbPersonIdentifierType as PersonIdentifierType }
export { convertStringPersonIdentifierType }
