import { AMQPMessage } from '@/types/AMQPMessage'
import { DataEvent } from '@/types/DataEvent'
import { HarvestingStateEvent } from '@/types/HarvestingStateEvent'
import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'

/**
 * Abstract class for a message processing worker.
 */
export abstract class MessageProcessingWorker<T extends AMQPMessage> {
  constructor(protected message: T) {}

  /**
   * Process the message associated with this worker.
   */
  abstract process(): Promise<
    DataEvent[] | HarvestingStateEvent[] | HarvestingResultEvent[]
  >
}
