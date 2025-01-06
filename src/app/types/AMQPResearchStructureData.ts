import { AMQPEntityData } from './AMQPEntityData'

export interface AMQPResearchStructureData extends AMQPEntityData {
  name: string
  description?: string
}
