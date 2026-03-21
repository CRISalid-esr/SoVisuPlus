import { ResearchUnitWithRelations as DbResearchUnit } from '@/prisma-schema/extended-client'
import {
  ResearchUnitIdentifier,
  ResearchUnitIdentifierType,
} from '@/types/ResearchUnitIdentifier'
import { IAgent } from '@/types/IAgent'
import { Literal } from '@/types/Literal'
import { ExtendedLanguageCode } from './ExtendLanguageCode'
import { ResearchUnitIdentifierType as DbResearchUnitIdentifierType } from '@prisma/client'

interface ResearchUnitJson {
  uid: string
  slug: string | null
  acronym: string | null
  names: Array<Literal>
  descriptions: Array<Literal>
  signature: string | null
  identifiers: ResearchUnitIdentifier[]
}

class ResearchUnit implements IAgent {
  constructor(
    public uid: string,
    public acronym: string | null,
    public names: Array<Literal>,
    public descriptions: Array<Literal>,
    public signature: string | null,
    private _identifiers: {
      type: ResearchUnitIdentifierType
      value: string
    }[] = [],
    public type: 'research_unit' = 'research_unit',
    public slug: string | null = null,
    public external: boolean = false,
  ) {
    this.identifiers = _identifiers
  }

  get membershipAcronyms(): string[] {
    return this.acronym ? [this.acronym] : []
  }

  get membershipSignatures(): string[] {
    return this.signature ? [this.signature] : []
  }

  /**
   * Get the display name of the research unit
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

  set identifiers(value: ResearchUnitIdentifier[]) {
    value.forEach((identifier) => {
      if (!identifier.type) {
        throw new Error(`Identifier type is required`)
      }
      if (
        !Object.values(DbResearchUnitIdentifierType).includes(identifier.type)
      ) {
        throw new Error(
          `${identifier.type} is not a valid ResearchUnitIdentifierType`,
        )
      }
      if (!identifier.value) {
        throw new Error(`Identifier value is required`)
      }
    })
  }

  get identifiers(): ResearchUnitIdentifier[] {
    return this._identifiers
  }

  hasIdHAL(): boolean {
    return this.identifiers.some(
      (id) => id.type == ResearchUnitIdentifierType.hal,
    )
  }

  static fromDbResearchUnit(researchUnit: DbResearchUnit): ResearchUnit {
    return new ResearchUnit(
      researchUnit.uid,
      researchUnit.acronym,
      researchUnit.names.map(Literal.fromObject),
      researchUnit.descriptions.map(Literal.fromObject),
      researchUnit.signature,
      'identifiers' in researchUnit
        ? (researchUnit.identifiers as ResearchUnitIdentifier[])
        : [],
      'research_unit',
      researchUnit.slug,
    )
  }

  static fromJson(researchUnit: ResearchUnitJson): ResearchUnit {
    return new ResearchUnit(
      researchUnit.uid,
      researchUnit.acronym || null,
      researchUnit.names?.map(Literal.fromObject),
      researchUnit.descriptions?.map(Literal.fromObject),
      researchUnit.signature || null,
      'identifiers' in researchUnit ? researchUnit.identifiers : [],
      'research_unit',
      researchUnit.slug,
    )
  }
}

const isResearchUnit = (agent: IAgent | null | undefined): boolean =>
  !!agent && agent.type === 'research_unit'

export { ResearchUnit, isResearchUnit }
export type { ResearchUnitJson }
