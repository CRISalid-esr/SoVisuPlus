import { AMQPPersonData } from '@/types/AMQPPersonData'
import { AMQPMessage } from '@/types/AMQPMessage'

export interface AMQPPersonMessage extends AMQPMessage<AMQPPersonData> {
  type: 'person'
}
