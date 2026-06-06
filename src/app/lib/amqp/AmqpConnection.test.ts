import * as amqplib from 'amqplib'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

jest.mock('amqplib')

const makeChannel = (): jest.Mocked<Partial<amqplib.Channel>> => ({
  prefetch: jest.fn().mockResolvedValue(undefined),
  assertQueue: jest
    .fn()
    .mockResolvedValue({ queue: '', messageCount: 0, consumerCount: 0 }),
  assertExchange: jest.fn().mockResolvedValue({ exchange: '' }),
  bindQueue: jest.fn().mockResolvedValue({}),
  consume: jest.fn().mockResolvedValue({ consumerTag: '' }),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockReturnValue(true),
})

describe('AmqpConnection', () => {
  let mockInteractiveChannel: ReturnType<typeof makeChannel>
  let mockBatchChannel: ReturnType<typeof makeChannel>
  let mockChannelModel: jest.Mocked<Partial<amqplib.ChannelModel>>
  let mockRecoveryModel: { on: jest.Mock; close: jest.Mock }
  let mockConnect: jest.Mock
  let connection: AmqpConnection
  let capturedSetup: (model: amqplib.ChannelModel) => Promise<void>

  beforeEach(() => {
    jest.resetAllMocks()

    mockInteractiveChannel = makeChannel()
    mockBatchChannel = makeChannel()

    let channelCallCount = 0
    mockChannelModel = {
      createChannel: jest.fn().mockImplementation(() => {
        channelCallCount++
        return channelCallCount % 2 === 1
          ? mockInteractiveChannel
          : mockBatchChannel
      }),
    }

    mockRecoveryModel = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    }

    mockConnect = amqplib.connect as jest.Mock
    mockConnect.mockImplementation(
      async (
        _url: string,
        socketOptions?: {
          recovery?: { setup?: (model: amqplib.ChannelModel) => Promise<void> }
        },
      ) => {
        if (socketOptions?.recovery?.setup) {
          capturedSetup = socketOptions.recovery.setup
          await capturedSetup(mockChannelModel as amqplib.ChannelModel)
        }
        return mockRecoveryModel
      },
    )

    connection = new AmqpConnection()
  })

  describe('connect()', () => {
    it('calls connect with the correct AMQP URL', async () => {
      await connection.connect()

      expect(mockConnect).toHaveBeenCalledWith(
        `amqp://${process.env.AMQP_USER}:${process.env.AMQP_PASSWORD}@${process.env.AMQP_HOST}:${process.env.AMQP_PORT}`,
        expect.objectContaining({ recovery: expect.any(Object) }),
      )
    })

    it('passes recovery options with setup callback', async () => {
      await connection.connect()

      const [, socketOptions] = mockConnect.mock.calls[0]
      expect(socketOptions.recovery).toMatchObject({
        initialDelay: 2000,
        maxDelay: 30000,
        factor: 2,
        jitter: 0.1,
        setup: expect.any(Function),
      })
    })

    it('attaches disconnect and reconnect-scheduled listeners', async () => {
      await connection.connect()

      expect(mockRecoveryModel.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      )
      expect(mockRecoveryModel.on).toHaveBeenCalledWith(
        'reconnect-scheduled',
        expect.any(Function),
      )
    })

    it('sets connected = true after setup', async () => {
      await connection.connect()

      expect(connection['connected']).toBe(true)
    })

    it('propagates connection errors without swallowing them', async () => {
      mockConnect.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(connection.connect()).rejects.toThrow('ECONNREFUSED')
    })
  })

  describe('setupChannels()', () => {
    it('creates two channels with correct prefetch values', async () => {
      await connection.connect()

      expect(mockChannelModel.createChannel).toHaveBeenCalledTimes(2)
      expect(mockInteractiveChannel.prefetch).toHaveBeenCalledWith(5)
      expect(mockBatchChannel.prefetch).toHaveBeenCalledWith(20)
    })

    it('asserts the exchange on both channels', async () => {
      await connection.connect()

      expect(mockInteractiveChannel.assertExchange).toHaveBeenCalledWith(
        'graph',
        'topic',
        { durable: true },
      )
      expect(mockBatchChannel.assertExchange).toHaveBeenCalledWith(
        'graph',
        'topic',
        { durable: true },
      )
    })

    it('asserts DLQs bound to dlx.graph', async () => {
      await connection.connect()

      expect(mockInteractiveChannel.assertQueue).toHaveBeenCalledWith(
        'dlq.sovisuplus-interactive',
        {
          durable: true,
          arguments: { 'x-consumer-timeout': 43200000 },
        },
      )
      expect(mockInteractiveChannel.bindQueue).toHaveBeenCalledWith(
        'dlq.sovisuplus-interactive',
        'dlx.graph',
        '#',
      )

      expect(mockBatchChannel.assertQueue).toHaveBeenCalledWith(
        'dlq.sovisuplus-batch',
        {
          durable: true,
          arguments: { 'x-consumer-timeout': 43200000 },
        },
      )
      expect(mockBatchChannel.bindQueue).toHaveBeenCalledWith(
        'dlq.sovisuplus-batch',
        'dlx.graph',
        '#',
      )
    })

    it('asserts both main queues with DLX arguments', async () => {
      await connection.connect()

      expect(mockInteractiveChannel.assertQueue).toHaveBeenCalledWith(
        'sovisuplus-interactive',
        {
          durable: true,
          arguments: {
            'x-consumer-timeout': 43200000,
            'x-dead-letter-exchange': 'dlx.graph',
            'x-dead-letter-routing-key': 'sovisuplus-interactive',
          },
        },
      )
      expect(mockBatchChannel.assertQueue).toHaveBeenCalledWith(
        'sovisuplus-batch',
        {
          durable: true,
          arguments: {
            'x-consumer-timeout': 43200000,
            'x-dead-letter-exchange': 'dlx.graph',
            'x-dead-letter-routing-key': 'sovisuplus-batch',
          },
        },
      )
    })

    it('binds interactive queue with .interactive binding keys', async () => {
      await connection.connect()

      const interactiveKeys = [
        'event.people.person.*.interactive',
        'event.structures.structure.*.interactive',
        'event.documents.document.*.interactive',
        'event.harvestings.*.*.interactive',
      ]
      for (const key of interactiveKeys) {
        expect(mockInteractiveChannel.bindQueue).toHaveBeenCalledWith(
          'sovisuplus-interactive',
          'graph',
          key,
        )
      }
    })

    it('binds batch queue with .batch binding keys', async () => {
      await connection.connect()

      const batchKeys = [
        'event.people.person.*.batch',
        'event.structures.structure.*.batch',
        'event.documents.document.*.batch',
        'event.harvestings.*.*.batch',
      ]
      for (const key of batchKeys) {
        expect(mockBatchChannel.bindQueue).toHaveBeenCalledWith(
          'sovisuplus-batch',
          'graph',
          key,
        )
      }
    })
  })

  describe('consumeInteractive()', () => {
    it('registers a consumer on the interactive channel', async () => {
      await connection.connect()
      const handler = jest.fn().mockResolvedValue(undefined)

      await connection.consumeInteractive(handler)

      expect(mockInteractiveChannel.consume).toHaveBeenCalledWith(
        'sovisuplus-interactive',
        expect.any(Function),
        { noAck: false },
      )
    })

    it('acks the message on handler success', async () => {
      await connection.connect()
      const handler = jest.fn().mockResolvedValue(undefined)
      const message = { content: Buffer.from('{"type":"person"}') }

      let consumeCallback: (msg: amqplib.ConsumeMessage | null) => Promise<void>
      ;(mockInteractiveChannel.consume as jest.Mock).mockImplementation(
        (_q, cb) => {
          consumeCallback = cb
          return Promise.resolve({ consumerTag: '' })
        },
      )

      await connection.consumeInteractive(handler)
      await consumeCallback!(message as unknown as amqplib.ConsumeMessage)

      expect(handler).toHaveBeenCalledWith('{"type":"person"}')
      expect(mockInteractiveChannel.ack).toHaveBeenCalledWith(message)
      expect(mockInteractiveChannel.nack).not.toHaveBeenCalled()
    })

    it('nacks the message when handler throws', async () => {
      await connection.connect()
      const handler = jest
        .fn()
        .mockRejectedValue(new Error('processing failed'))
      const message = { content: Buffer.from('{"type":"person"}') }

      let consumeCallback: (msg: amqplib.ConsumeMessage | null) => Promise<void>
      ;(mockInteractiveChannel.consume as jest.Mock).mockImplementation(
        (_q, cb) => {
          consumeCallback = cb
          return Promise.resolve({ consumerTag: '' })
        },
      )

      await connection.consumeInteractive(handler)
      await consumeCallback!(message as unknown as amqplib.ConsumeMessage)

      expect(mockInteractiveChannel.nack).toHaveBeenCalledWith(
        message,
        false,
        false,
      )
      expect(mockInteractiveChannel.ack).not.toHaveBeenCalled()
    })

    it('ignores null messages', async () => {
      await connection.connect()
      const handler = jest.fn()

      let consumeCallback: (msg: amqplib.ConsumeMessage | null) => Promise<void>
      ;(mockInteractiveChannel.consume as jest.Mock).mockImplementation(
        (_q, cb) => {
          consumeCallback = cb
          return Promise.resolve({ consumerTag: '' })
        },
      )

      await connection.consumeInteractive(handler)
      await consumeCallback!(null)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('consumeBatch()', () => {
    it('registers a consumer on the batch channel', async () => {
      await connection.connect()
      const handler = jest.fn().mockResolvedValue(undefined)

      await connection.consumeBatch(handler)

      expect(mockBatchChannel.consume).toHaveBeenCalledWith(
        'sovisuplus-batch',
        expect.any(Function),
        { noAck: false },
      )
    })

    it('nacks the message when handler throws', async () => {
      await connection.connect()
      const handler = jest
        .fn()
        .mockRejectedValue(new Error('processing failed'))
      const message = { content: Buffer.from('{"type":"document"}') }

      let consumeCallback: (msg: amqplib.ConsumeMessage | null) => Promise<void>
      ;(mockBatchChannel.consume as jest.Mock).mockImplementation((_q, cb) => {
        consumeCallback = cb
        return Promise.resolve({ consumerTag: '' })
      })

      await connection.consumeBatch(handler)
      await consumeCallback!(message as unknown as amqplib.ConsumeMessage)

      expect(mockBatchChannel.nack).toHaveBeenCalledWith(message, false, false)
      expect(mockBatchChannel.ack).not.toHaveBeenCalled()
    })
  })

  describe('publish()', () => {
    it('appends .interactive to the routing key', async () => {
      await connection.connect()

      await connection.publish('graph', 'task.documents.document.merge', '{}')

      expect(mockInteractiveChannel.publish).toHaveBeenCalledWith(
        'graph',
        'task.documents.document.merge.interactive',
        Buffer.from('{}'),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
        }),
      )
    })

    it('buffers messages when not connected and flushes on reconnect', async () => {
      await connection.connect()
      connection['connected'] = false

      await connection.publish('graph', 'task.documents.document.merge', '{}')
      expect(mockInteractiveChannel.publish).not.toHaveBeenCalled()
      expect(connection['pendingMessages']).toHaveLength(1)

      // Simulate reconnect by calling setup again
      await capturedSetup(mockChannelModel as amqplib.ChannelModel)

      expect(mockInteractiveChannel.publish).toHaveBeenCalledWith(
        'graph',
        'task.documents.document.merge.interactive',
        Buffer.from('{}'),
        expect.any(Object),
      )
      expect(connection['pendingMessages']).toHaveLength(0)
    })

    it('drops messages and warns when buffer is full', async () => {
      await connection.connect()
      connection['connected'] = false
      console.warn = jest.fn()

      for (let i = 0; i < 101; i++) {
        await connection.publish('graph', `task.${i}`, '{}')
      }

      expect(connection['pendingMessages']).toHaveLength(100)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('buffer full'),
      )
    })
  })

  describe('reconnect — setup replays stored handlers', () => {
    it('re-registers consumers after reconnect', async () => {
      await connection.connect()
      const interactiveHandler = jest.fn().mockResolvedValue(undefined)
      const batchHandler = jest.fn().mockResolvedValue(undefined)

      await connection.consumeInteractive(interactiveHandler)
      await connection.consumeBatch(batchHandler)

      // Simulate reconnect: reset call counts, call setup again with a fresh model
      ;(mockInteractiveChannel.consume as jest.Mock).mockClear()
      ;(mockBatchChannel.consume as jest.Mock).mockClear()

      let secondCallCount = 0
      mockChannelModel.createChannel = jest.fn().mockImplementation(() => {
        secondCallCount++
        return secondCallCount % 2 === 1
          ? mockInteractiveChannel
          : mockBatchChannel
      })

      await capturedSetup(mockChannelModel as amqplib.ChannelModel)

      expect(mockInteractiveChannel.consume).toHaveBeenCalledWith(
        'sovisuplus-interactive',
        expect.any(Function),
        { noAck: false },
      )
      expect(mockBatchChannel.consume).toHaveBeenCalledWith(
        'sovisuplus-batch',
        expect.any(Function),
        { noAck: false },
      )
    })
  })

  describe('close()', () => {
    it('closes both channels and the recovery model', async () => {
      await connection.connect()

      await connection.close()

      expect(mockInteractiveChannel.close).toHaveBeenCalled()
      expect(mockBatchChannel.close).toHaveBeenCalled()
      expect(mockRecoveryModel.close).toHaveBeenCalled()
      expect(connection['connected']).toBe(false)
    })

    it('does nothing when not connected', async () => {
      await connection.connect()
      connection['connected'] = false

      await connection.close()

      expect(mockRecoveryModel.close).not.toHaveBeenCalled()
    })
  })
})
