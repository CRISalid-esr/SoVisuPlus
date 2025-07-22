import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPHarvestingResultData } from '@/types/AMQPHarvestingResultData'

export interface AMQPHarvestingResultEventMessage
  extends AMQPMessage<AMQPHarvestingResultData> {
  type: 'harvesting_result_event'
}
