import * as client from 'amqplib'
import { Channel, Connection } from 'amqplib'

type AMQPMessageHandler = (message: string) => void

class AmqpConnection {
  private connection!: Connection
  private channel!: Channel
  private connected: boolean
  private readonly DEFAULT_QUEUE_NAME = 'sovisuplus'
  private readonly EXCHANGE_NAME = 'amqp.topic'
  private readonly BINDING_KEYS = [
    'event.people.person.*',
    'event.structures.structure.*',
    'event.documents.document.*',
  ]

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

      await this.channel.prefetch(10)

      await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', {
        durable: true,
      })
      this.connected = true
    } catch (error) {
      console.error(error)
      console.error(`Not connected to AMQP Server`)
    }
  }

  async consume(handleIncomingNotification: AMQPMessageHandler) {
    const queueName = process.env.AMQP_QUEUE_NAME || this.DEFAULT_QUEUE_NAME

    await this.channel.assertQueue(queueName, {
      durable: true,
    })

    for (const bindingKey of this.BINDING_KEYS) {
      await this.channel.bindQueue(queueName, this.EXCHANGE_NAME, bindingKey)
    }

    await this.channel.consume(
      queueName,
      async (message) => {
        if (!message) {
          return console.error(`Invalid incoming message`)
        }
        await handleIncomingNotification(message.content.toString())
        this.channel.ack(message)
      },
      {
        noAck: false,
      },
    )
  }
}

export default AmqpConnection
