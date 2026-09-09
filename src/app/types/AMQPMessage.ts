import { AMQPEntityMessage } from '@/types/AMQPEntityMessage'
import { AMQPHarvestingMessage } from '@/types/AMQPHarvestingMessage'
import { AMQPChangeEventMessage } from '@/types/AMQPChangeEventMessage'

export type AMQPMessage =
  | AMQPEntityMessage
  | AMQPHarvestingMessage
  | AMQPChangeEventMessage
