import { ResearchStructureIdentifierType as DbResearchStructureIdentifierType } from '@prisma/client'

type ResearchStructureIdentifier = {
  type: DbResearchStructureIdentifierType
  value: string
}

const convertStringResearchStructureIdentifierType = (
  value: string,
): DbResearchStructureIdentifierType => {
  switch (value.toLowerCase()) {
    case 'rnsr':
      return DbResearchStructureIdentifierType.RNSR
    case 'idref':
      return DbResearchStructureIdentifierType.IDREF
    case 'local':
      return DbResearchStructureIdentifierType.LOCAL
    default:
      throw new Error(`Unsupported identifier type: ${value}`)
  }
}

export type { ResearchStructureIdentifier }
export { DbResearchStructureIdentifierType as ResearchStructureIdentifierType }
export { convertStringResearchStructureIdentifierType }
