import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPResearchUnitMessage } from '@/types/AMQPResearchUnitMessage'

export type AMQPEntityMessage =
  | AMQPDocumentMessage
  | AMQPPersonMessage
  | AMQPResearchUnitMessage
