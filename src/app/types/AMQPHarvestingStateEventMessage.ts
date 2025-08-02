import { AMQPHarvestingStateData } from '@/types/AMQPHarvestingStateData'

export interface AMQPHarvestingStateEventMessage {
  type: 'harvesting_state_event'
  event: 'started' | 'running' | 'completed' | 'error'
  fields: AMQPHarvestingStateData
}
