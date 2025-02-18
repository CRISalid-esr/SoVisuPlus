import { IEntity } from '@/types/IEntity'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export interface IAgent extends IEntity {
  type: 'person' | 'research_structure' | 'institution'
  slug: string | null //TODO make non-nullable

  getDisplayName(language?: ExtendedLanguageCode): string
}
