import { AMQPData } from '@/types/AMQPData'

export interface AMQPHarvestingStateData extends AMQPData {
  harvester: string
  state: 'running' | 'completed' | 'error'
  error: string[]
  entity: {
    identifiers: Array<{ type: string; value: string }>
    name: string
  }
}
