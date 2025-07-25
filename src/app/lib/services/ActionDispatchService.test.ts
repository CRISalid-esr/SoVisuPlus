import { ActionDispatchService } from './ActionDispatchService'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

// Mocks
jest.mock('@/lib/daos/ActionDAO')
jest.mock('@/lib/amqp/AmqpConnection')

describe('ActionDispatchService', () => {
  let service: ActionDispatchService
  const mockPublish = jest.fn()
  const mockFetchUndispatched = jest.fn()
  const mockMarkAsDispatched = jest.fn()

  const mockConnection = {
    publish: mockPublish,
  } as unknown as AmqpConnection

  beforeEach(() => {
    jest.clearAllMocks()
    ;(ActionDAO as jest.Mock).mockImplementation(() => ({
      fetchUndispatchedActions: mockFetchUndispatched,
      markActionAsDispatched: mockMarkAsDispatched,
    }))

    service = new ActionDispatchService(mockConnection)
  })

  it('should publish and mark actions as dispatched', async () => {
    const action = {
      id: 'a1',
      actionType: ActionType.ADD,
      targetType: ActionTargetType.DOCUMENT,
      targetUid: 'doc-1',
      path: 'subjects',
      parameters: { subject: 'sociology' },
      timestamp: new Date('2025-07-15T10:00:00Z'),
      dispatched: false,
      personUid: 'user-123',
    }

    mockFetchUndispatched.mockResolvedValue([action])
    mockPublish.mockResolvedValue(undefined)
    mockMarkAsDispatched.mockResolvedValue(undefined)

    await service.dispatchActions()

    expect(mockFetchUndispatched).toHaveBeenCalledWith(100)
    expect(mockPublish).toHaveBeenCalledWith(
      'graph',
      'task.documents.document.add',
      JSON.stringify({
        id: action.id,
        actionType: ActionType.ADD,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: action.targetUid,
        path: action.path,
        parameters: action.parameters,
        timestamp: action.timestamp.toISOString(),
        personUid: action.personUid,
        application: 'sovisuplus',
      }),
    )
    expect(mockMarkAsDispatched).toHaveBeenCalledWith('a1')
  })

  it('should do nothing when no actions found', async () => {
    mockFetchUndispatched.mockResolvedValue([])

    await service.dispatchActions()

    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })

  it('should handle fetch error gracefully', async () => {
    mockFetchUndispatched.mockRejectedValue(new Error('DB failure'))

    await expect(service.dispatchActions()).resolves.toBeUndefined()

    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('should handle publish errors and continue', async () => {
    const action = {
      id: 'a2',
      actionType: ActionType.REMOVE,
      targetType: ActionTargetType.DOCUMENT,
      targetUid: 'doc-2',
      path: 'titles',
      parameters: { title: 'Old title' },
      timestamp: new Date(),
      dispatched: false,
      personUid: 'user-456',
    }

    mockFetchUndispatched.mockResolvedValue([action])
    mockPublish.mockRejectedValue(new Error('Publish failed'))

    await service.dispatchActions()

    expect(mockPublish).toHaveBeenCalled()
    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })
})
