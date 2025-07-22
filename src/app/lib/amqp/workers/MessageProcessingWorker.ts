import { AMQPMessage } from '@/types/AMQPMessage'
import { DataEvent } from '@/types/DataEvent'
import { HarvestingStateEvent } from '@/types/HarvestingStateEvent'
import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'

/**
 * Abstract class for a message processing worker.
 * The message is passed via the constructor and stored as a property.
 */
export abstract class MessageProcessingWorker<T extends AMQPMessage<unknown>> {
  constructor(protected message: T) {}

  /**
   * Process the message associated with this worker.
   */
  abstract process(): Promise<
    DataEvent[] | HarvestingStateEvent[] | HarvestingResultEvent[]
  >
}
