import { AMQPOrganizationUnitData } from '@/types/AMQPOrganizationUnitData'

export const ORGANIZATION_MESSAGE_TYPES = [
  'institution',
  'institution_subdivision',
  'unit',
  'unit_subdivision',
  'team',
] as const

export type OrganizationMessageType =
  (typeof ORGANIZATION_MESSAGE_TYPES)[number]

export interface AMQPOrganizationUnitMessage {
  type: OrganizationMessageType
  event: 'created' | 'updated' | 'deleted' | 'unchanged'
  fields: AMQPOrganizationUnitData
}
