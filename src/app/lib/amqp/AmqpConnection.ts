import { Channel, connect, ChannelModel as Connection } from 'amqplib'

type AMQPMessageHandler = (message: string) => void

export class AmqpConnection {
  private connection!: Connection
  private channel!: Channel
  private connected: boolean
  private readonly DEFAULT_QUEUE_NAME = 'sovisuplus'
  private readonly DEFAULT_EXCHANGE_NAME = 'graph'
  private readonly BINDING_KEYS = [
    'event.people.person.*',
    'event.structures.structure.*',
    'event.documents.document.*',
    'event.harvestings.*.*',
  ]

  constructor() {
    this.connected = false
  }

  async connect() {
    if (this.connected && this.channel) return

    try {
      const user = encodeURIComponent(process.env.AMQP_USER || '')
      const pass = encodeURIComponent(process.env.AMQP_PASSWORD || '')
      const host = process.env.AMQP_HOST
      const port = process.env.AMQP_PORT
      const exchangeName =
        process.env.AMQP_EXCHANGE_NAME || this.DEFAULT_EXCHANGE_NAME

      const amqpUrl = `amqp://${user}:${pass}@${host}:${port}`

      this.connection = await connect(amqpUrl)

      this.channel = await this.connection.createChannel()

      await this.channel.prefetch(10)

      await this.channel.assertExchange(exchangeName, 'topic', {
        durable: true,
      })

      this.connected = true
      console.log(`✅ Connected to RabbitMQ at ${host}:${port}`)
    } catch (error) {
      console.error(`AMQP connection failed`)
      console.error(
        `Host: ${process.env.AMQP_HOST}, Port: ${process.env.AMQP_PORT}`,
      )
      console.error(`User: ${process.env.AMQP_USER}`)
      console.error(`Error: ${(error as Error).message || error}`)
    }
  }

  async consume(handleIncomingNotification: AMQPMessageHandler) {
    const queueName = process.env.AMQP_QUEUE_NAME || this.DEFAULT_QUEUE_NAME
    const exchangeName =
      process.env.AMQP_EXCHANGE_NAME || this.DEFAULT_EXCHANGE_NAME

    await this.channel.assertQueue(queueName, {
      durable: true,
    })

    for (const bindingKey of this.BINDING_KEYS) {
      await this.channel.bindQueue(queueName, exchangeName, bindingKey)
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

  async publish(exchange: string, routingKey: string, message: string) {
    if (!this.connected) throw new Error('Not connected to AMQP')

    this.channel.publish(exchange, routingKey, Buffer.from(message), {
      persistent: true,
      contentType: 'application/json',
    })
    console.log(
      `✅ Message published to exchange "${exchange}" with routing key "${routingKey}"`,
    )
  }

  async close() {
    if (this.connected) {
      await this.channel.close()
      await this.connection.close()
      this.connected = false
      console.log('✅ AMQP connection closed')
    }
  }
}
