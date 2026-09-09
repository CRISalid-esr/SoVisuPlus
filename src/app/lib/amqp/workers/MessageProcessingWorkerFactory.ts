import { AMQPMessage } from '@/types/AMQPMessage'

import {
  isChangeEventMessage,
  isDocumentMessage,
  isHarvestingResultEventMessage,
  isHarvestingStateEventMessage,
  isOrganizationUnitMessage,
  isPersonMessage,
} from '@/lib/amqp/utils/typeGuards'

import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { OrganizationUnitWorker } from '@/lib/amqp/workers/OrganizationUnitWorker'
import { DocumentWorker } from '@/lib/amqp/workers/DocumentWorker'
import { HarvestingStateEventWorker } from '@/lib/amqp/workers/HarvestingStateEventWorker'
import { HarvestingResultEventWorker } from '@/lib/amqp/workers/HarvestingResultEventWorker'
import { ChangeEventWorker } from '@/lib/amqp/workers/ChangeEventWorker'

import { PersonDAO } from '@/lib/daos/PersonDAO'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { UserDAO } from '@/lib/daos/UserDAO'

import { DocumentGraphQLClient } from '@/lib/graphql/DocumentGraphQLClient'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { OrganizationUnitGraphQLClient } from '@/lib/graphql/OrganizationUnitGraphQLClient'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'

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

    if (isOrganizationUnitMessage(message)) {
      return new OrganizationUnitWorker(
        message,
        new OrganizationUnitDAO(),
        new OrganizationUnitGraphQLClient(),
        new OrganizationUnitService(),
      )
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

    if (isChangeEventMessage(message)) {
      return new ChangeEventWorker(message, new DocumentDAO())
    }

    throw new Error(
      `Unsupported message type: ${(message as unknown as { type: string }).type}`,
    )
  }
}
