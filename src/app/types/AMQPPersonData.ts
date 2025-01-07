import { AMQPEntityData } from './AMQPEntityData'

export interface AMQPPersonData extends AMQPEntityData {
  display_name: string
  first_name: string
  last_name: string
  external: boolean
  memberships: Array<{
    entity_uid: string
    research_structure: {
      names: string[]
      identifiers: Array<{ type: string; value: string }>
    }
    start_date: string | null
    end_date: string | null
  }>
}
