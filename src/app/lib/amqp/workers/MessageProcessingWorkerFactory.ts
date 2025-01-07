import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPEntityData } from '@/types/AMQPEntityData'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'

export class MessageProcessingWorkerFactory {
  createWorker(
    message: AMQPMessage<AMQPEntityData>,
  ): MessageProcessingWorker<AMQPMessage<AMQPEntityData>> {
    switch (message.type) {
      case 'person':
        return new PersonWorker(message as AMQPPersonMessage)
      case 'research_structure':
        return new ResearchStructureWorker(
          message as AMQPResearchStructureMessage,
        )
      default:
        throw new Error(`Unsupported message type: ${message.type}`)
    }
  }
}
