import { Channel, ChannelModel, RecoveringChannelModel, connect } from 'amqplib'

export type MessageHandler = (content: string) => Promise<void>

interface PendingMessage {
  exchange: string
  routingKey: string
  message: string
}

export class AmqpConnection {
  private recoveryModel!: RecoveringChannelModel
  private interactiveChannel!: Channel
  private batchChannel!: Channel
  private interactiveHandler?: MessageHandler
  private batchHandler?: MessageHandler
  private connected = false
  private pendingMessages: PendingMessage[] = []

  private readonly INTERACTIVE_BINDING_KEYS = [
    'event.people.person.*.interactive',
    'event.structures.structure.*.interactive',
    'event.documents.document.*.interactive',
    'event.harvestings.*.*.interactive',
  ]
  private readonly BATCH_BINDING_KEYS = [
    'event.people.person.*.batch',
    'event.structures.structure.*.batch',
    'event.documents.document.*.batch',
    'event.harvestings.*.*.batch',
  ]

  private get exchangeName() {
    return process.env.AMQP_EXCHANGE_NAME || 'graph'
  }
  private get interactiveQueueName() {
    return process.env.AMQP_INTERACTIVE_QUEUE_NAME || 'sovisuplus-interactive'
  }
  private get batchQueueName() {
    return process.env.AMQP_BATCH_QUEUE_NAME || 'sovisuplus-batch'
  }

  async connect() {
    const user = encodeURIComponent(process.env.AMQP_USER || '')
    const pass = encodeURIComponent(process.env.AMQP_PASSWORD || '')
    const host = process.env.AMQP_HOST
    const port = process.env.AMQP_PORT
    const amqpUrl = `amqp://${user}:${pass}@${host}:${port}`

    this.recoveryModel = await connect(amqpUrl, {
      recovery: {
        initialDelay: 2000,
        maxDelay: 30000,
        factor: 2,
        jitter: 0.1,
        setup: (model: ChannelModel) => this.setupChannels(model),
      },
    })

    this.recoveryModel.on('disconnect', (err) => {
      this.connected = false
      console.warn(`⚠️ Disconnected from RabbitMQ: ${err.message}`)
    })
    this.recoveryModel.on('reconnect-scheduled', ({ attempt, delay }) => {
      console.log(`🔄 RabbitMQ reconnect attempt ${attempt} in ${delay}ms`)
    })

    console.log(`✅ Connected to RabbitMQ at ${host}:${port}`)
  }

  private async setupChannels(model: ChannelModel) {
    this.interactiveChannel = await model.createChannel()
    this.batchChannel = await model.createChannel()

    await this.interactiveChannel.prefetch(5)
    await this.batchChannel.prefetch(20)

    const exchange = this.exchangeName
    await this.interactiveChannel.assertExchange(exchange, 'topic', {
      durable: true,
    })
    await this.batchChannel.assertExchange(exchange, 'topic', { durable: true })

    await this.setupQueue(
      this.interactiveChannel,
      this.interactiveQueueName,
      this.INTERACTIVE_BINDING_KEYS,
      exchange,
    )
    await this.setupQueue(
      this.batchChannel,
      this.batchQueueName,
      this.BATCH_BINDING_KEYS,
      exchange,
    )

    if (this.interactiveHandler) {
      await this.registerConsumer(
        this.interactiveChannel,
        this.interactiveQueueName,
        this.interactiveHandler,
      )
    }
    if (this.batchHandler) {
      await this.registerConsumer(
        this.batchChannel,
        this.batchQueueName,
        this.batchHandler,
      )
    }

    this.connected = true
    await this.flushPendingMessages()
    console.log('✅ RabbitMQ channels ready')
  }

  private async setupQueue(
    channel: Channel,
    queueName: string,
    bindingKeys: string[],
    exchange: string,
  ) {
    const dlqName = `dlq.${queueName}`

    await channel.assertQueue(dlqName, {
      durable: true,
      arguments: { 'x-consumer-timeout': 43200000 },
    })
    await channel.bindQueue(dlqName, 'dlx.graph', '#')

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-consumer-timeout': 43200000,
        'x-dead-letter-exchange': 'dlx.graph',
        'x-dead-letter-routing-key': queueName,
      },
    })

    for (const key of bindingKeys) {
      await channel.bindQueue(queueName, exchange, key)
    }
  }

  private async registerConsumer(
    channel: Channel,
    queueName: string,
    messageHandler: MessageHandler,
  ) {
    await channel.consume(
      queueName,
      async (message) => {
        if (!message) return
        try {
          await messageHandler(message.content.toString())
          channel.ack(message)
        } catch {
          channel.nack(message, false, false)
        }
      },
      { noAck: false },
    )
  }

  async consumeInteractive(messageHandler: MessageHandler) {
    this.interactiveHandler = messageHandler
    await this.registerConsumer(
      this.interactiveChannel,
      this.interactiveQueueName,
      messageHandler,
    )
  }

  async consumeBatch(messageHandler: MessageHandler) {
    this.batchHandler = messageHandler
    await this.registerConsumer(
      this.batchChannel,
      this.batchQueueName,
      messageHandler,
    )
  }

  async publish(exchange: string, routingKey: string, message: string) {
    const fullRoutingKey = `${routingKey}.interactive`

    if (!this.connected) {
      if (this.pendingMessages.length >= 100) {
        console.warn(
          `⚠️ Pending message buffer full, dropping message for ${fullRoutingKey}`,
        )
        return
      }
      this.pendingMessages.push({
        exchange,
        routingKey: fullRoutingKey,
        message,
      })
      console.warn(`⚠️ Not connected, buffering message for ${fullRoutingKey}`)
      return
    }

    this.interactiveChannel.publish(
      exchange,
      fullRoutingKey,
      Buffer.from(message),
      {
        persistent: true,
        contentType: 'application/json',
      },
    )
    console.log(
      `✅ Message published to exchange "${exchange}" with routing key "${fullRoutingKey}"`,
    )
  }

  private async flushPendingMessages() {
    const pending = this.pendingMessages.splice(0)
    for (const { exchange, routingKey, message } of pending) {
      this.interactiveChannel.publish(
        exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
        },
      )
    }
    if (pending.length > 0) {
      console.log(`✅ Flushed ${pending.length} pending messages`)
    }
  }

  async close() {
    if (this.connected) {
      await this.interactiveChannel.close()
      await this.batchChannel.close()
      await this.recoveryModel.close()
      this.connected = false
      console.log('✅ AMQP connection closed')
    }
  }
}
