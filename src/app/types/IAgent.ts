import { IEntity } from '@/types/IEntity'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export interface IAgent extends IEntity {
  type: 'person' | 'research_structure' | 'institution'

  getDisplayName(language?: ExtendedLanguageCode): string
}
