import prisma from '@/lib/daos/prisma'
import MessageProcessingService from '@/lib/amqp/services/MessageProcessingService'
import { WebSocketNotifier } from '@/lib/websocket/WebSocketNotifier'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

jest.mock('@/lib/websocket/WebSocketNotifier')

describe('MessageProcessingService Integration Test', () => {
  const notifyClients = jest.fn()
  const personUid = 'test-person-001'

  beforeAll(() => {
    ;(WebSocketNotifier.notifyClients as jest.Mock) = notifyClients
  })

  afterEach(async () => {
    await prisma.person.deleteMany()
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should process a harvesting_state_event message and notify WebSocket clients', async () => {
    await prisma.person.create({
      data: {
        uid: personUid,
        external: false,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        normalizedName: 'jane doe',
        identifiers: {
          create: [
            {
              type: PersonIdentifierType.LOCAL,
              value: 'local-1234',
            },
          ],
        },
      },
    })

    const message: AMQPHarvestingStateEventMessage = {
      type: 'harvesting_state_event',
      event: 'running',
      fields: {
        harvester: 'hal',
        state: 'running',
        error: [],
        entity: {
          name: 'Jane Doe',
          identifiers: [{ type: 'local', value: 'local-1234' }],
        },
      },
    }

    const service = MessageProcessingService.getInstance()
    await service.processMessage(message)

    expect(notifyClients).toHaveBeenCalledTimes(1)

    const event = notifyClients.mock.calls[0][0]
    expect(event.type).toBe('harvesting_state')
    expect(event.platform).toBe('hal')
    expect(event.personUid).toBe(personUid)
    expect(event.state).toBe('running')
  })
})
