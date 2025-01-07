import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'

/**
 * Worker for processing research structure-related messages
 */
export class ResearchStructureWorker extends MessageProcessingWorker<AMQPResearchStructureMessage> {
  /**
   * Constructor
   * @param message - The research structure message to process
   */
  constructor(message: AMQPResearchStructureMessage) {
    super(message)
  }

  /**
   * Process a research structure message by fetching data from the graph and updating the database
   */
  public async process(): Promise<void> {}
}
