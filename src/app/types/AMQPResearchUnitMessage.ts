import { AMQPResearchUnitData } from '@/types/AMQPResearchUnitData'

export interface AMQPResearchUnitMessage {
  type: 'unit'
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
  fields: AMQPResearchUnitData
}
