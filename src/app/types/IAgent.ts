import { IEntity } from '@/types/IEntity'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export interface IAgentJson {
  uid: string
  slug: string | null
}

export type AgentType =
  | 'person'
  | 'institution'
  | 'research_unit'
  | 'other_structure'
  | 'team'
const AGENT_TYPE_VALUES = new Set<AgentType>([
  'person',
  'institution',
  'research_unit',
  'other_structure',
  'team',
])

export const agentTypeFromString = (value: string | null): AgentType | null => {
  if (value === null || !AGENT_TYPE_VALUES.has(value as AgentType)) {
    return null
  }
  return value as AgentType
}

/** Organization perspective groups (every agent type except person) */
export type OrganizationGroup = Exclude<AgentType, 'person'>

export const ORGANIZATION_GROUPS: OrganizationGroup[] = [
  'institution',
  'research_unit',
  'other_structure',
  'team',
]

export interface IAgent extends IEntity {
  type: AgentType
  slug: string | null //TODO make non-nullable

  get membershipAcronyms(): string[]
  get membershipSignatures(): string[]

  getDisplayName(language?: ExtendedLanguageCode): string
}

export interface IAgentClass {
  fromJson(json: IAgentJson): IAgent
}
