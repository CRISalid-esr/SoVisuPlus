import * as dotenv from 'dotenv'
import AmqpConnection from '@/lib/amqp/AmqpConnection'

dotenv.config()
;(async () => {
  try {
    console.log('Connecting to RabbitMQ...')
    const connection = new AmqpConnection()
    await connection.connect()
    console.log('Connected to RabbitMQ')
    await connection.consume((msg) => {
      console.log('Received message from RabbitMQ:', msg)
    })
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error)
  }
})()
