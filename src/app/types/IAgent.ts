import { IEntity } from '@/types/IEntity'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export interface IAgentJson {
  uid: string
  slug: string | null
}

export type AgentType = 'person' | 'research_structure' | 'institution'
const AGENT_TYPE_VALUES = new Set<AgentType>([
  'person',
  'research_structure',
  'institution',
])

export const agentTypeFromString = (value: string | null): AgentType | null => {
  if (value === null || !AGENT_TYPE_VALUES.has(value as AgentType)) {
    return null
  }
  return value as AgentType
}

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
