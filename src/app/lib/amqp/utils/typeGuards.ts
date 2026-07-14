import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import {
  AMQPOrganizationUnitMessage,
  ORGANIZATION_MESSAGE_TYPES,
} from '@/types/AMQPOrganizationUnitMessage'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'
import { AMQPChangeEventMessage } from '@/types/AMQPChangeEventMessage'

export const isPersonMessage = (msg: AMQPMessage): msg is AMQPPersonMessage =>
  msg.type === 'person'

export const isOrganizationUnitMessage = (
  msg: AMQPMessage,
): msg is AMQPOrganizationUnitMessage =>
  (ORGANIZATION_MESSAGE_TYPES as readonly string[]).includes(msg.type)

export const isDocumentMessage = (
  msg: AMQPMessage,
): msg is AMQPDocumentMessage => msg.type === 'document'

export const isHarvestingStateEventMessage = (
  msg: AMQPMessage,
): msg is AMQPHarvestingStateEventMessage =>
  msg.type === 'harvesting_state_event'

export const isHarvestingResultEventMessage = (
  msg: AMQPMessage,
): msg is AMQPHarvestingResultEventMessage =>
  msg.type === 'harvesting_result_event'

export const isChangeEventMessage = (
  msg: AMQPMessage,
): msg is AMQPChangeEventMessage => msg.type === 'change'
