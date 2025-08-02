import { AMQPPersonData } from '@/types/AMQPPersonData'

export interface AMQPPersonMessage {
  type: 'person'
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
  fields: AMQPPersonData
}
