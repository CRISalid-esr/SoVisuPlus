import { AMQPResearchUnitData } from '@/types/AMQPResearchUnitData'

export interface AMQPResearchUnitMessage {
  type: 'research_unit'
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
  fields: AMQPResearchUnitData
}
