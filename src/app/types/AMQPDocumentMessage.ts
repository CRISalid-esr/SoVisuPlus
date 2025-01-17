import { AMQPDocumentData } from '@/types/AMQPDocumentData'
import { AMQPMessage } from '@/types/AMQPMessage'

export interface AMQPPersonMessage extends AMQPMessage<AMQPDocumentData> {
  type: 'person'
}
