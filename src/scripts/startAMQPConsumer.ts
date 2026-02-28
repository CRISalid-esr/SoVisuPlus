import { AMQPMessage } from '@/types/AMQPMessage'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'
import { Sema } from 'async-sema'
import MessageProcessingService from '@/lib/amqp/services/MessageProcessingService'

export const startAMQPConsumer = async (
  connection: AmqpConnection,
  semaphore: Sema,
): Promise<void> => {
  const processingService = MessageProcessingService.getInstance()

  await connection.consume(async (msg: string) => {
    try {
      const parsedMessage: AMQPMessage = JSON.parse(msg)
      console.log('Processing message:', parsedMessage)

      await semaphore.acquire()
      await processingService.processMessage(parsedMessage)
    } catch (error) {
      console.error('❌ Error parsing/processing message:', error)
    } finally {
      semaphore.release()
    }
  })
}
