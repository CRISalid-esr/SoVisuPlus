import * as dotenv from 'dotenv'
import { Sema } from 'async-sema'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

import { startWebSocketServer } from './startWebSocketServer'
import { startAMQPConsumer } from './startAMQPConsumer'
import { startChangePoller } from './startChangePoller'

dotenv.config()
;(async () => {
  try {
    const websocketPort = 3001
    console.log(`Starting WebSocket server on port ${websocketPort}...`)
    startWebSocketServer(websocketPort)

    console.log('Connecting to RabbitMQ...')
    const connection = new AmqpConnection()
    await connection.connect()

    const interactiveSemaphore = new Sema(1)
    const batchSemaphore = new Sema(1)
    await startAMQPConsumer(connection, interactiveSemaphore, batchSemaphore)
    startChangePoller(connection)
  } catch (error) {
    console.error('❌ Error during startup:', error)
  }
})()
