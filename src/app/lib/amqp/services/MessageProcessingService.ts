import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPEntityData } from '@/types/AMQPEntityData'
import { MessageProcessingWorkerFactory } from '@/lib/amqp/workers/MessageProcessingWorkerFactory'
import { WebSocketNotifier } from '@/lib/websocket/WebSocketNotifier'

export default class MessageProcessingService {
  private static instance: MessageProcessingService | null = null
  private workerFactory: MessageProcessingWorkerFactory

  private constructor() {
    this.workerFactory = new MessageProcessingWorkerFactory()
  }

  static getInstance(): MessageProcessingService {
    if (!MessageProcessingService.instance) {
      MessageProcessingService.instance = new MessageProcessingService()
    }
    return MessageProcessingService.instance
  }

  async processMessage<T extends AMQPMessage<AMQPEntityData>>(
    message: T,
  ): Promise<void> {
    const worker = this.workerFactory.createWorker(message)
    const events = await worker.process()
    for (const event of events) {
      WebSocketNotifier.notifyClients(event)
    }
  }
}
