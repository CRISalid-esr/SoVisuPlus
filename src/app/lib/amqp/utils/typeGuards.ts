import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'

export function isPersonMessage(msg: AMQPMessage): msg is AMQPPersonMessage {
  return msg.type === 'person'
}

export function isResearchStructureMessage(
  msg: AMQPMessage,
): msg is AMQPResearchStructureMessage {
  return msg.type === 'research_structure'
}

export function isDocumentMessage(
  msg: AMQPMessage,
): msg is AMQPDocumentMessage {
  return msg.type === 'document'
}

export function isHarvestingStateEventMessage(
  msg: AMQPMessage,
): msg is AMQPHarvestingStateEventMessage {
  return msg.type === 'harvesting_state_event'
}

export function isHarvestingResultEventMessage(
  msg: AMQPMessage,
): msg is AMQPHarvestingResultEventMessage {
  return msg.type === 'harvesting_result_event'
}
