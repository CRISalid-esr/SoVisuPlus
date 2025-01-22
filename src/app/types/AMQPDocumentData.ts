import { AMQPEntityData } from './AMQPEntityData'

export interface AMQPDocumentData extends AMQPEntityData {
  titles: { value: string; language: string }[]
}
