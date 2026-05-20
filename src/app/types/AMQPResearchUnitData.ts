import { AMQPEntityData } from './AMQPEntityData'

export interface AMQPResearchUnitData extends AMQPEntityData {
  uid: string
  national_type: string | null
  identifiers: { type: string; value: string }[]
  long_labels: { value: string; language: string }[]
  short_labels: { value: string; language: string }[]
  descriptions: { value: string; language: string }[]
  main_mission: string
}
