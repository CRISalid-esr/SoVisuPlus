import { AMQPDocumentData } from '@/types/AMQPDocumentData'
import { AMQPMessage } from '@/types/AMQPMessage'

export interface AMQPDocumentMessage extends AMQPMessage<AMQPDocumentData> {
  type: 'document'
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
}
