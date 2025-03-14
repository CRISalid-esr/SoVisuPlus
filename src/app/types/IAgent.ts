import { IEntity } from '@/types/IEntity'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export interface IAgentJson {
  uid: string
  slug: string | null
}

export interface IAgent extends IEntity {
  type: 'person' | 'research_structure' | 'institution'
  slug: string | null //TODO make non-nullable

  getDisplayName(language?: ExtendedLanguageCode): string
}

export interface IAgentClass {
  fromJson(json: IAgentJson): IAgent
}
