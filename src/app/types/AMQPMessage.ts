export interface AMQPMessage<T> {
  type:
    | 'person'
    | 'research_structure'
    | 'document'
    | 'harvesting_state_event'
    | 'harvesting_result_event'
  event: string
  fields: T
}
