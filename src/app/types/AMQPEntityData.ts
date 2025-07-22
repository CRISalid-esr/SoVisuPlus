import { AMQPData } from '@/types/AMQPData'

export interface AMQPEntityData extends AMQPData {
  uid: string
  identifiers: Array<{ type: string; value: string }>
}
