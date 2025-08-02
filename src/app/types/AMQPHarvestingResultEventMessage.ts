import { AMQPHarvestingResultData } from '@/types/AMQPHarvestingResultData'

export interface AMQPHarvestingResultEventMessage {
  type: 'harvesting_result_event'
  event: 'created' | 'updated' | 'unchanged' | 'deleted'
  fields: AMQPHarvestingResultData
}
