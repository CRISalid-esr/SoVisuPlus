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
    const websocketPort = parseInt(process.env.WS_PORT || '3001', 10)
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
