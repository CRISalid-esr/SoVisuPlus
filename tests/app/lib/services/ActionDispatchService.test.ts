import prisma from '@/lib/daos/prisma'
import { ActionDispatchService } from '@/lib/services/ActionDispatchService'
import { ActionTargetType, ActionType } from '@prisma/client'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

// Mock AMQP connection
const mockPublish = jest.fn()
const mockAmqpConnection = {
  publish: mockPublish,
} as unknown as AmqpConnection

describe('ActionDispatchService Integration Test', () => {
  let service: ActionDispatchService

  beforeAll(() => {
    service = new ActionDispatchService(mockAmqpConnection)
  })

  beforeEach(async () => {
    await prisma.action.deleteMany()
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should publish undispatched actions and mark them as dispatched', async () => {
    const now = new Date()

    const action = await prisma.action.create({
      data: {
        id: 'test-action-123',
        actionType: ActionType.ADD,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: 'doc-xyz',
        path: 'titles',
        parameters: { lang: 'fr', value: 'Titre' },
        personUid: 'person-001',
        dispatched: false,
        timestamp: now,
      },
    })

    await service.dispatchActions()

    // ✅ 1. Ensure the action was published with correct routing key and payload
    expect(mockPublish).toHaveBeenCalledWith(
      'graph',
      'task.documents.document.add',
      JSON.stringify({
        id: action.id,
        actionType: 'ADD',
        targetType: 'DOCUMENT',
        targetUid: 'doc-xyz',
        path: 'titles',
        parameters: { lang: 'fr', value: 'Titre' },
        timestamp: now.toISOString(),
        personUid: 'person-001',
        application: 'sovisuplus',
      }),
    )

    // ✅ 2. Ensure the action is now marked as dispatched
    const updated = await prisma.action.findUnique({ where: { id: action.id } })
    expect(updated?.dispatched).toBe(true)
  })
})
