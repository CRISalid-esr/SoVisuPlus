import { ResearchStructureIdentifierType as DbResearchStructureIdentifierType } from '@prisma/client'

type ResearchStructureIdentifier = {
  type: DbResearchStructureIdentifierType
  value: string
}

export type { ResearchStructureIdentifier }
export { DbResearchStructureIdentifierType as ResearchStructureIdentifierType }
