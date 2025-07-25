import { AMQPDocumentData } from '@/types/AMQPDocumentData'

export interface AMQPDocumentMessage {
  type: 'document'
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
  fields: AMQPDocumentData
}
