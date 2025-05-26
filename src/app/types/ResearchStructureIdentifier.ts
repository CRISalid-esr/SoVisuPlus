import { ResearchStructureIdentifierType as DbResearchStructureIdentifierType } from '@prisma/client'

type ResearchStructureIdentifier = {
  type: DbResearchStructureIdentifierType
  value: string
}

const convertStringResearchStructureIdentifierType = (
  value: string,
): DbResearchStructureIdentifierType => {
  switch (value.toLowerCase()) {
    case 'nns':
      return DbResearchStructureIdentifierType.NNS
    case 'idref':
      return DbResearchStructureIdentifierType.IDREF
    case 'local':
      return DbResearchStructureIdentifierType.LOCAL
    case 'hal':
      return DbResearchStructureIdentifierType.HAL
    case 'ror':
      return DbResearchStructureIdentifierType.ROR
    case 'scopus_id':
      return DbResearchStructureIdentifierType.SCOPUS_ID
    default:
      throw new Error(`Unsupported identifier type: ${value}`)
  }
}

export type { ResearchStructureIdentifier }
export { DbResearchStructureIdentifierType as ResearchStructureIdentifierType }
export { convertStringResearchStructureIdentifierType }
