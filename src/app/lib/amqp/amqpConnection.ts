import * as client from 'amqplib'
import { Channel, Connection } from 'amqplib'

type AMQPMessageHandler = (message: string) => void

class AMQPConnection {
  connection!: Connection
  channel!: Channel
  private connected!: boolean

  constructor() {
    this.connected = false
  }

  async connect() {
    if (this.connected && this.channel) return
    try {
      this.connection = await client.connect(
        `amqp://${process.env.AMQP_USER}:${process.env.AMQP_PASSWORD}@${process.env.AMQP_HOST}:${process.env.AMQP_PORT}`,
      )
      this.channel = await this.connection.createChannel()
      this.connected = true
    } catch (error) {
      console.error(error)
      console.error(`Not connected to AMQP Server`)
    }
  }

  private readonly DEFAULT_QUEUE_NAME = 'sovisuplus'

  async consume(handleIncomingNotification: AMQPMessageHandler) {
    await this.channel.assertQueue(
      process.env.AMQP_QUEUE_NAME || this.DEFAULT_QUEUE_NAME,
      {
        durable: true,
      },
    )

    await this.channel.consume(
      process.env.AMQP_QUEUE_NAME || 'sovisuplus',
      (message) => {
        {
          if (!message) {
            return console.error(`Invalid incoming message`)
          }
          handleIncomingNotification(message?.content?.toString())
          this.channel.ack(message)
        }
      },
      {
        noAck: false,
      },
    )
  }
}

export default AMQPConnection
