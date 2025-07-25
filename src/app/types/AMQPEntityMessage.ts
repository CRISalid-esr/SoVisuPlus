import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'

export type AMQPEntityMessage =
  | AMQPDocumentMessage
  | AMQPPersonMessage
  | AMQPResearchStructureMessage
