import { AMQPMessage } from '@/types/AMQPMessage'

import {
  isDocumentMessage,
  isHarvestingResultEventMessage,
  isHarvestingStateEventMessage,
  isPersonMessage,
  isResearchStructureMessage,
} from '@/lib/amqp/utils/typeGuards'

import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { DocumentWorker } from '@/lib/amqp/workers/DocumentWorker'
import { HarvestingStateEventWorker } from '@/lib/amqp/workers/HarvestingStateEventWorker'
import { HarvestingResultEventWorker } from '@/lib/amqp/workers/HarvestingResultEventWorker'

import { PersonDAO } from '@/lib/daos/PersonDAO'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
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

    if (isResearchStructureMessage(message)) {
      return new ResearchStructureWorker(message, new ResearchStructureDAO())
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
