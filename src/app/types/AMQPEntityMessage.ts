import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPOrganizationUnitMessage } from '@/types/AMQPOrganizationUnitMessage'

export type AMQPEntityMessage =
  | AMQPDocumentMessage
  | AMQPPersonMessage
  | AMQPOrganizationUnitMessage
