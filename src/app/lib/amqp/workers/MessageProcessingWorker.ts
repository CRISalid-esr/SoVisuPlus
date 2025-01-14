import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPEntityData } from '@/types/AMQPEntityData'

/**
 * Abstract class for a message processing worker.
 * The message is passed via the constructor and stored as a property.
 */
export abstract class MessageProcessingWorker<
  T extends AMQPMessage<AMQPEntityData>,
> {
  constructor(protected message: T) {}

  /**
   * Process the message associated with this worker.
   */
  abstract process(): Promise<void>
}
