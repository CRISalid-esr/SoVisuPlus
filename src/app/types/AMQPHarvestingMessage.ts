import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'

export type AMQPHarvestingMessage =
  | AMQPHarvestingStateEventMessage
  | AMQPHarvestingResultEventMessage
