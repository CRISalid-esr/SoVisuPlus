import * as dotenv from 'dotenv'
import { Sema } from 'async-sema'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

import { startWebSocketServer } from './startWebSocketServer'
import { startAMQPConsumer } from './startAMQPConsumer'
import { startChangePoller } from './startChangePoller'

dotenv.config()
;(async () => {
  const semaphore = new Sema(1)

  try {
    const websocketPort = process.env.WS_PORT
      ? parseInt(process.env.WS_PORT, 10)
      : 3001
    console.log(`Starting WebSocket server on port ${websocketPort}...`)
    startWebSocketServer(websocketPort)

    console.log('Connecting to RabbitMQ...')
    const connection = new AmqpConnection()
    await connection.connect()
    console.log('Connected to RabbitMQ')

    await startAMQPConsumer(connection, semaphore)
    startChangePoller(connection)
  } catch (error) {
    console.error('❌ Error during startup:', error)
  }
})()
