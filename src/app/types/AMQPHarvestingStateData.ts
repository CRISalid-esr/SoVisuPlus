export interface AMQPHarvestingStateData {
  harvester: string
  state: 'running' | 'completed' | 'error'
  error: string[]
  entity: {
    identifiers: Array<{ type: string; value: string }>
    name: string
  }
}
