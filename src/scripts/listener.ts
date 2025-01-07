import 'tsconfig-paths/register'
import * as dotenv from 'dotenv'
import AmqpConnection from '@/lib/amqp/AmqpConnection'
import MessageProcessingService from '@/lib/amqp/services/MessageProcessingService'
import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPEntityData } from '@/types/AMQPEntityData'

dotenv.config()
;(async () => {
  try {
    console.log('Connecting to RabbitMQ...')
    const connection = new AmqpConnection()
    await connection.connect()
    console.log('Connected to RabbitMQ')
    const processingService = MessageProcessingService.getInstance()

    await connection.consume((msg: string) => {
      try {
        const parsedMessage: AMQPMessage<AMQPEntityData> = JSON.parse(msg)
        console.log('Processing message:', parsedMessage)
        processingService.processMessage(parsedMessage)
      } catch (parseError) {
        console.error('Failed to parse or process message:', parseError)
      }
    })
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error)
  }
})()
