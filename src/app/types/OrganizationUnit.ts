import { OrganizationUnitWithRelations as DbOrganizationUnit } from '@/prisma-schema/extended-client'
import {
  OrganizationUnitIdentifier,
  OrganizationIdentifierType,
} from '@/types/OrganizationUnitIdentifier'
import { AgentType, IAgent } from '@/types/IAgent'
import { Literal } from '@/types/Literal'
import type { OrganizationRelation } from '@/types/OrganizationRelation'
import { ExtendedLanguageCode } from './ExtendLanguageCode'
import {
  OrganizationCategory,
  OrganizationGenericType,
  OrganizationIdentifierType as DbOrganizationIdentifierType,
} from '@prisma/client'

interface OrganizationUnitJson {
  uid: string
  slug: string | null
  acronym: string | null
  names: Array<Literal>
  descriptions: Array<Literal>
  category: OrganizationCategory
  genericType: OrganizationGenericType
  nationalType: string | null
  localTypes: Array<Literal>
  external: boolean
  identifiers: OrganizationUnitIdentifier[]
}

const ORGANIZATION_AGENT_TYPES = new Set<AgentType>([
  'institution',
  'research_unit',
  'other_structure',
  'team',
])

class OrganizationUnit implements IAgent {
  /**
   * Organization-to-organization relationships (child → parent).
   * Populated by the graph GraphQL client; parents are shallow
   * (no recursive relationships).
   */
  public parents: OrganizationRelation[] = []

  constructor(
    public uid: string,
    public acronym: string | null,
    public names: Array<Literal>,
    public descriptions: Array<Literal>,
    public category: OrganizationCategory,
    public genericType: OrganizationGenericType,
    public nationalType: string | null = null,
    private _identifiers: {
      type: OrganizationIdentifierType
      value: string
    }[] = [],
    public slug: string | null = null,
    public external: boolean = false,
    public localTypes: Array<Literal> = [],
  ) {
    this.identifiers = _identifiers
  }

  /**
   * Perspective group the organization belongs to.
   * Support, administrative and teaching units fall under 'other_structure'
   * but are excluded from perspective search server-side.
   */
  get type(): AgentType {
    switch (this.category) {
      case OrganizationCategory.institution:
        return 'institution'
      case OrganizationCategory.research_unit:
        return 'research_unit'
      case OrganizationCategory.team:
        return 'team'
      default:
        return 'other_structure'
    }
  }

  get membershipAcronyms(): string[] {
    return this.acronym ? [this.acronym] : []
  }

  get membershipSignatures(): string[] {
    return []
  }

  /**
   * Get the display name of the organization unit
   * @param language
   * @returns The name in the specified language, or the name in english, or the first name, or an empty string
   */
  getDisplayName(language?: ExtendedLanguageCode): string {
    return (
      this.names.find((name) => name.language === language)?.value ||
      this.names.find((name) => name.language === 'en')?.value ||
      this.names[0]?.value ||
      ''
    )
  }

  /**
   * Type label to display: local type first, national type as fallback.
   * The generic type is never displayed — it is a classification tag only.
   */
  getDisplayType(language?: ExtendedLanguageCode): string | null {
    return (
      this.localTypes.find((lt) => lt.language === language)?.value ||
      this.localTypes[0]?.value ||
      this.nationalType ||
      null
    )
  }

  set identifiers(value: OrganizationUnitIdentifier[]) {
    value.forEach((identifier) => {
      if (!identifier.type) {
        throw new Error(`Identifier type is required`)
      }
      if (
        !Object.values(DbOrganizationIdentifierType).includes(identifier.type)
      ) {
        throw new Error(
          `${identifier.type} is not a valid OrganizationIdentifierType`,
        )
      }
      if (!identifier.value) {
        throw new Error(`Identifier value is required`)
      }
    })
  }

  get identifiers(): OrganizationUnitIdentifier[] {
    return this._identifiers
  }

  hasIdHAL(): boolean {
    return this.identifiers.some(
      (id) => id.type == OrganizationIdentifierType.hal,
    )
  }

  static fromDbOrganizationUnit(
    organizationUnit: DbOrganizationUnit,
  ): OrganizationUnit {
    return new OrganizationUnit(
      organizationUnit.uid,
      organizationUnit.acronym,
      organizationUnit.labels
        .filter((label) => label.kind === 'long')
        .map(Literal.fromObject),
      organizationUnit.descriptions.map(Literal.fromObject),
      organizationUnit.category,
      organizationUnit.genericType,
      organizationUnit.nationalType,
      'identifiers' in organizationUnit
        ? (organizationUnit.identifiers as OrganizationUnitIdentifier[])
        : [],
      organizationUnit.slug,
      organizationUnit.external,
      Array.isArray(organizationUnit.localTypes)
        ? (organizationUnit.localTypes as unknown as Array<Literal>).map(
            Literal.fromObject,
          )
        : [],
    )
  }

  static fromJson(organizationUnit: OrganizationUnitJson): OrganizationUnit {
    return new OrganizationUnit(
      organizationUnit.uid,
      organizationUnit.acronym || null,
      organizationUnit.names?.map(Literal.fromObject) || [],
      organizationUnit.descriptions?.map(Literal.fromObject) || [],
      organizationUnit.category,
      organizationUnit.genericType,
      organizationUnit.nationalType || null,
      'identifiers' in organizationUnit ? organizationUnit.identifiers : [],
      organizationUnit.slug,
      organizationUnit.external || false,
      organizationUnit.localTypes?.map(Literal.fromObject) || [],
    )
  }
}

const isOrganizationUnit = (agent: IAgent | null | undefined): boolean =>
  !!agent && ORGANIZATION_AGENT_TYPES.has(agent.type)

const isResearchUnit = (agent: IAgent | null | undefined): boolean =>
  !!agent && agent.type === 'research_unit'

export { OrganizationUnit, isOrganizationUnit, isResearchUnit }
export type { OrganizationUnitJson }
