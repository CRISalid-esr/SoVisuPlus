import { AMQPEntityMessage } from '@/types/AMQPEntityMessage'
import { AMQPHarvestingMessage } from '@/types/AMQPHarvestingMessage'

export type AMQPMessage = AMQPEntityMessage | AMQPHarvestingMessage
