import * as amqplib from 'amqplib'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

jest.mock('amqplib')

describe('AMQPConnection', () => {
  let mockChannel: Partial<amqplib.Channel>
  let mockConnection: Partial<amqplib.ChannelModel>
  let amqpConnection: AmqpConnection
  let mockAmqpLibConnect: jest.Mock
  let mockChannelConsume: jest.Mock

  beforeEach(() => {
    jest.resetAllMocks()

    mockChannel = {
      prefetch: jest.fn(),
      assertQueue: jest.fn(),
      assertExchange: jest.fn(), // Make sure to mock this method
      bindQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
    }

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
    }

    mockAmqpLibConnect = amqplib.connect as jest.Mock

    mockAmqpLibConnect.mockResolvedValue(mockConnection)

    amqpConnection = new AmqpConnection()
  })

  it('should connect to RabbitMQ successfully', async () => {
    await amqpConnection.connect()

    expect(amqplib.connect).toHaveBeenCalledWith(
      `amqp://${process.env.AMQP_USER}:${process.env.AMQP_PASSWORD}@${process.env.AMQP_HOST}:${process.env.AMQP_PORT}`,
    )

    expect(mockConnection.createChannel).toHaveBeenCalled()
    expect(mockChannel.prefetch).toHaveBeenCalledWith(10)
    expect(mockChannel.assertExchange).toHaveBeenCalledWith('graph', 'topic', {
      durable: true,
    })
    expect(amqpConnection['connected']).toBe(true)
  })

  it('should not reconnect if already connected', async () => {
    amqpConnection['connected'] = true
    amqpConnection['channel'] = mockChannel as amqplib.Channel

    await amqpConnection.connect()

    expect(amqplib.connect).not.toHaveBeenCalled()
    expect(mockConnection.createChannel).not.toHaveBeenCalled()
  })

  it('should consume messages and handle incoming notifications', async () => {
    const handleIncomingNotification = jest.fn()

    const message = { content: Buffer.from('test message') }

    mockChannelConsume = mockChannel.consume as jest.Mock

    mockChannelConsume.mockImplementation((_queue, callback) => {
      callback(message)
    })

    await amqpConnection.connect()
    await amqpConnection.consume(handleIncomingNotification)

    expect(mockChannel.assertQueue).toHaveBeenCalledWith(
      process.env.AMQP_QUEUE_NAME || 'sovisuplus',
      { durable: true },
    )
    expect(mockChannel.consume).toHaveBeenCalled()
    expect(handleIncomingNotification).toHaveBeenCalledWith('test message')
    expect(mockChannel.ack).toHaveBeenCalledWith(message)
  })

  it('should handle errors during connection', async () => {
    mockAmqpLibConnect.mockRejectedValue(new Error('Connection error'))

    console.error = jest.fn()

    await amqpConnection.connect()

    expect(console.error).toHaveBeenCalledWith(`AMQP connection failed`)
    expect(amqpConnection['connected']).toBe(false)
  })
})
