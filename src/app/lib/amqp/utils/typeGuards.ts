import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'

export const isPersonMessage = (msg: AMQPMessage): msg is AMQPPersonMessage =>
  msg.type === 'person'

export const isResearchStructureMessage = (
  msg: AMQPMessage,
): msg is AMQPResearchStructureMessage => msg.type === 'research_structure'

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
