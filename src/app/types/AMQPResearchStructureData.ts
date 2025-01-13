import { AMQPEntityData } from './AMQPEntityData'

export interface AMQPResearchStructureData extends AMQPEntityData {
  uid: string
  identifiers: { type: string; value: string }[]
  names: { value: string; language: string }[]
  acronym: string | null
  descriptions: { value: string; language: string }[]
}
