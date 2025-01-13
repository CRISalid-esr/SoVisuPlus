import { ResearchStructure as DbResearchStructure } from '@prisma/client'
import { ResearchStructureIdentifier } from '@/types/ResearchStructureIdentifier'

class ResearchStructure {
  uid: string
  acronym: string | null
  names: Record<string, string>
  descriptions: Record<string, string>
  identifiers: ResearchStructureIdentifier[]

  constructor(
    uid: string,
    acronym: string | null,
    names: Record<string, string>,
    descriptions: Record<string, string>,
    identifiers: ResearchStructureIdentifier[] = [],
  ) {
    this.uid = uid
    this.acronym = acronym
    this.names = names
    this.descriptions = descriptions
    this.identifiers = identifiers
  }

  // Static method to create a ResearchStructure object from a JSON object
  static fromDbResearchStructure(
    researchStructure: DbResearchStructure,
  ): ResearchStructure {
    return new ResearchStructure(
      researchStructure.uid,
      researchStructure.acronym,
      researchStructure.names as Record<string, string>,
      researchStructure.descriptions as Record<string, string>,
      'identifiers' in researchStructure
        ? (researchStructure.identifiers as ResearchStructureIdentifier[])
        : [],
    )
  }
}

export { ResearchStructure }
