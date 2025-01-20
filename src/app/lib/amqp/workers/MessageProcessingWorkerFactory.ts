import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPEntityData } from '@/types/AMQPEntityData'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { DocumentWorker } from '@/lib/amqp/workers/DocumentWorker'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'

export class MessageProcessingWorkerFactory {
  createWorker(
    message: AMQPMessage<AMQPEntityData>,
  ): MessageProcessingWorker<AMQPMessage<AMQPEntityData>> {
    switch (message.type) {
      case 'person':
        return new PersonWorker(
          message as AMQPPersonMessage,
          new PersonDAO(),
          new UserDAO(),
          new PersonGraphQLClient(),
        )
      case 'research_structure':
        return new ResearchStructureWorker(
          message as AMQPResearchStructureMessage,
          new ResearchStructureDAO(),
        )
      case 'document':
        return new DocumentWorker(
          message as AMQPDocumentMessage,
          new DocumentDAO(),
        )
      default:
        throw new Error(`Unsupported message type: ${message.type}`)
    }
  }
}
