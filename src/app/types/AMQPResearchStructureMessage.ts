import { AMQPResearchStructureData } from '@/types/AMQPResearchStructureData'

export interface AMQPResearchStructureMessage {
  type: 'research_structure'
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
  fields: AMQPResearchStructureData
}
