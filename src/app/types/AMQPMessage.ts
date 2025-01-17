import { AMQPEntityData } from '@/types/AMQPEntityData'

export interface AMQPMessage<T extends AMQPEntityData> {
  type: 'person' | 'research_structure' | 'document'
  event: string
  fields: T
}
