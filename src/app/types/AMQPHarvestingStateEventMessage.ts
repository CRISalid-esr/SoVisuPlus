import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPHarvestingStateData } from '@/types/AMQPHarvestingStateData'

export interface AMQPHarvestingStateEventMessage
  extends AMQPMessage<AMQPHarvestingStateData> {
  type: 'harvesting_state_event'
}
