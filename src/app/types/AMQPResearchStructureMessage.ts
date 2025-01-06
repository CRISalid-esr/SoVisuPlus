import { AMQPResearchStructureData } from '@/types/AMQPResearchStructureData'
import { AMQPMessage } from '@/types/AMQPMessage'

export interface AMQPResearchStructureMessage
  extends AMQPMessage<AMQPResearchStructureData> {
  type: 'research_structure'
}
