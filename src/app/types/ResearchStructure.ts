import { ResearchStructureWithRelations as DbResearchStructure } from '@/prisma-schema/extended-client'
import {
  ResearchStructureIdentifier,
  ResearchStructureIdentifierType,
} from '@/types/ResearchStructureIdentifier'
import { IAgent } from '@/types/IAgent'
import { Literal } from '@/types/Literal'
import { ExtendedLanguageCode } from './ExtendLanguageCode'

interface ResearchStructureJson {
  uid: string
  slug: string | null
  acronym: string | null
  names: Array<Literal>
  descriptions: Array<Literal>
  identifiers: ResearchStructureIdentifier[]
}

class ResearchStructure implements IAgent {
  constructor(
    public uid: string,
    public acronym: string | null,
    public names: Array<Literal>,
    public descriptions: Array<Literal>,
    private _identifiers: {
      type: ResearchStructureIdentifierType
      value: string
    }[] = [],
    public type: 'research_structure' = 'research_structure',
    public slug: string | null = null,
    public external: boolean = false,
  ) {
    this.identifiers = _identifiers
  }

  get membershipAcronyms(): string[] {
    return [this.acronym].filter((acronym) => acronym !== null)
  }

  /**
   * Get the display name of the research structure
   * @param language
   * @returns The name in the specified language, or the name in english, or the first name, or an empty string
   */
  getDisplayName(language?: ExtendedLanguageCode): string {
    return (
      this.names.find((name) => name.language === language)?.value ||
      this.names.find((name) => name.language === 'en')?.value ||
      this.names[0].value ||
      ''
    )
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
      researchStructure.names.map(Literal.fromObject),
      researchStructure.descriptions.map(Literal.fromObject),
      'identifiers' in researchStructure
        ? (researchStructure.identifiers as ResearchStructureIdentifier[])
        : [],
      'research_structure',
      researchStructure.slug,
    )
  }

  static fromJson(researchStructure: ResearchStructureJson): ResearchStructure {
    return new ResearchStructure(
      researchStructure.uid,
      researchStructure.acronym || null,
      researchStructure.names?.map(Literal.fromObject),
      researchStructure.descriptions?.map(Literal.fromObject),
      'identifiers' in researchStructure ? researchStructure.identifiers : [],
      'research_structure',
      researchStructure.slug,
    )
  }
}

export { ResearchStructure }
export type { ResearchStructureJson }
