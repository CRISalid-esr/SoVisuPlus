import { AMQPEntityData } from './AMQPEntityData'

/**
 * Structure event payload published by the graph.
 * Only `uid` is consumed: the message is a trigger, the authoritative
 * data is fetched from the graph GraphQL API.
 */
export interface AMQPOrganizationUnitData extends AMQPEntityData {
  uid: string
  national_type?: string | null
  identifiers: { type: string; value: string }[]
  long_labels?: { value: string; language: string }[]
  short_labels?: { value: string; language: string }[]
  descriptions?: { value: string; language: string }[]
  local_types?: { value: string; language: string }[]
  main_mission?: string | null
}
