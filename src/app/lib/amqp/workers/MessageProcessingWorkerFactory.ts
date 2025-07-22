import { AMQPMessage } from '@/types/AMQPMessage'
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
import { DocumentGraphQLClient } from '@/lib/graphql/DocumentGraphQLClient'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { HarvestingStateEventWorker } from '@/lib/amqp/workers/HarvestingStateEventWorker'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'
import { AMQPData } from '@/types/AMQPData'
import { HarvestingResultEventWorker } from '@/lib/amqp/workers/HarvestingResultEventWorker'

export class MessageProcessingWorkerFactory {
  createWorker(
    message: AMQPMessage<AMQPData>,
  ): MessageProcessingWorker<AMQPMessage<AMQPData>> {
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
          new DocumentGraphQLClient(),
        )
      case 'harvesting_state_event':
        return new HarvestingStateEventWorker(
          message as AMQPHarvestingStateEventMessage,
          new PersonDAO(),
        )
      case 'harvesting_result_event':
        return new HarvestingResultEventWorker(
          message as AMQPHarvestingResultEventMessage,
          new PersonDAO(),
        )
      default:
        throw new Error(`Unsupported message type: ${message.type}`)
    }
  }
}
