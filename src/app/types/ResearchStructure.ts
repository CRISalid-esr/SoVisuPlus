import { ResearchStructure as DbResearchStructure } from '@prisma/client'
import {
  ResearchStructureIdentifier,
  ResearchStructureIdentifierType,
} from '@/types/ResearchStructureIdentifier'

class ResearchStructure {
  constructor(
    public uid: string,
    public acronym: string | null,
    public names: Record<string, string>,
    public descriptions: Record<string, string>,
    private _identifiers: {
      type: ResearchStructureIdentifierType
      value: string
    }[] = [],
  ) {
    this.identifiers = _identifiers
  }

  set identifiers(value: ResearchStructureIdentifier[]) {
    value.forEach((identifier) => {
      if (!identifier.type) {
        throw new Error(`Identifier type is required`)
      }
      if (
        !Object.values(ResearchStructureIdentifierType).includes(
          identifier.type,
        )
      ) {
        throw new Error(
          `${identifier.type} is not a valid ResearchStructureIdentifierType`,
        )
      }
      if (!identifier.value) {
        throw new Error(`Identifier value is required`)
      }
    })
  }

  get identifiers(): ResearchStructureIdentifier[] {
    return this._identifiers
  }

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
