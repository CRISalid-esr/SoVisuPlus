import { AMQPMessage } from '@/types/AMQPMessage'

import {
  isDocumentMessage,
  isHarvestingResultEventMessage,
  isHarvestingStateEventMessage,
  isPersonMessage,
  isResearchUnitMessage,
} from '@/lib/amqp/utils/typeGuards'

import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { ResearchUnitWorker } from '@/lib/amqp/workers/ResearchUnitWorker'
import { DocumentWorker } from '@/lib/amqp/workers/DocumentWorker'
import { HarvestingStateEventWorker } from '@/lib/amqp/workers/HarvestingStateEventWorker'
import { HarvestingResultEventWorker } from '@/lib/amqp/workers/HarvestingResultEventWorker'

import { PersonDAO } from '@/lib/daos/PersonDAO'
import { ResearchUnitDAO } from '@/lib/daos/ResearchUnitDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { UserDAO } from '@/lib/daos/UserDAO'

import { DocumentGraphQLClient } from '@/lib/graphql/DocumentGraphQLClient'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'

export class MessageProcessingWorkerFactory {
  createWorker(message: AMQPMessage): MessageProcessingWorker<AMQPMessage> {
    if (isPersonMessage(message)) {
      return new PersonWorker(
        message,
        new PersonDAO(),
        new UserDAO(),
        new PersonGraphQLClient(),
      )
    }

    if (isResearchUnitMessage(message)) {
      return new ResearchUnitWorker(message, new ResearchUnitDAO())
    }

    if (isDocumentMessage(message)) {
      return new DocumentWorker(
        message,
        new DocumentDAO(),
        new DocumentGraphQLClient(),
      )
    }

    if (isHarvestingStateEventMessage(message)) {
      return new HarvestingStateEventWorker(message, new PersonDAO())
    }

    if (isHarvestingResultEventMessage(message)) {
      return new HarvestingResultEventWorker(message, new PersonDAO())
    }

    throw new Error(
      `Unsupported message type: ${(message as unknown as { type: string }).type}`,
    )
  }
}
