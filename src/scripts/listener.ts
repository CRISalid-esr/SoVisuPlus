import * as dotenv from 'dotenv'
import AmqpConnection from '@/lib/amqp/AmqpConnection'
import MessageProcessingService from '@/lib/amqp/services/MessageProcessingService'
import { AMQPMessage } from '@/types/AMQPMessage'
import { AMQPEntityData } from '@/types/AMQPEntityData'
import { Sema } from 'async-sema'
import { ActionDispatchService } from '../app/lib/services/ActionDispatchService'
import { WebSocketServer } from 'ws'
import { WebSocketNotifier } from '../app/lib/websocket/WebSocketNotifier'

dotenv.config()
;(async () => {
  // Migrate to application configuration
  const semaphore = new Sema(1)
  try {
    const websocketPort = process.env.WS_PORT
      ? parseInt(process.env.WS_PORT)
      : 3001
    const wss = new WebSocketServer({ port: websocketPort })

    WebSocketNotifier.attach(wss)

    setInterval(() => {
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          client.send(
            JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString(),
            }),
          )
        }
      }
    }, 30000) // Send ping every 30 seconds

    console.log(`WebSocket server listening on ws://localhost:${websocketPort}`)

    console.log('Connecting to RabbitMQ...')
    const connection = new AmqpConnection()
    await connection.connect()
    console.log('Connected to RabbitMQ')
    const processingService = MessageProcessingService.getInstance()

    // External queue consumer
    await connection.consume(async (msg: string) => {
      try {
        const parsedMessage: AMQPMessage<AMQPEntityData> = JSON.parse(msg)
        console.log('Processing message:', parsedMessage)
        await semaphore.acquire()
        await processingService.processMessage(parsedMessage)
      } catch (parseError) {
        console.error('Failed to parse or process message:', parseError)
      } finally {
        semaphore.release()
      }
    })

    // Internal change poller
    const changeDispatcher = new ActionDispatchService(connection)
    const pollIntervalMs = 3000

    const pollLoop = async () => {
      try {
        await changeDispatcher.dispatchActions()
      } catch (err) {
        console.error('❌ Error dispatching changes from DB:', err)
      } finally {
        setTimeout(pollLoop, pollIntervalMs)
      }
    }

    // Start the polling loop
    pollLoop()
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error)
  }
})()
