import { AMQPMessage } from '@/types/AMQPMessage'
import { AmqpConnection, MessageHandler } from '@/lib/amqp/AmqpConnection'
import { Sema } from 'async-sema'
import MessageProcessingService from '@/lib/amqp/services/MessageProcessingService'

export const startAMQPConsumer = async (
  connection: AmqpConnection,
  interactiveSemaphore: Sema,
  batchSemaphore: Sema,
): Promise<void> => {
  const processingService = MessageProcessingService.getInstance()

  const makeHandler =
    (semaphore: Sema): MessageHandler =>
    async (msg: string) => {
      const parsedMessage: AMQPMessage = JSON.parse(msg)
      console.log('Processing message:', parsedMessage)
      await semaphore.acquire()
      try {
        await processingService.processMessage(parsedMessage)
      } finally {
        semaphore.release()
      }
    }

  await connection.consumeInteractive(makeHandler(interactiveSemaphore))
  await connection.consumeBatch(makeHandler(batchSemaphore))
}
