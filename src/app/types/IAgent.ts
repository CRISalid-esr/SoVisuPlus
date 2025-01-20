import { IEntity } from '@/types/IEntity'

export interface IAgent extends IEntity {
  type: 'person' | 'research_structure' | 'institution'
}
