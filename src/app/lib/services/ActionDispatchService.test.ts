import { ActionDispatchService } from './ActionDispatchService'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { Action, ActionTargetType, ActionType } from '@/types/Action'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

// Mocks
jest.mock('@/lib/daos/ActionDAO')
jest.mock('@/lib/amqp/AmqpConnection')

describe('ActionDispatchService', () => {
  let service: ActionDispatchService
  const mockPublish = jest.fn()
  const mockFetchUndispatched = jest.fn()
  const mockMarkAsDispatched = jest.fn()
  const mockGetDbActionById = jest.fn()

  const mockConnection = {
    publish: mockPublish,
  } as unknown as AmqpConnection

  beforeEach(() => {
    jest.clearAllMocks()
    ;(ActionDAO as jest.Mock).mockImplementation(() => ({
      fetchUndispatchedActions: mockFetchUndispatched,
      markActionAsDispatched: mockMarkAsDispatched,
      getDbActionById: mockGetDbActionById,
    }))

    service = new ActionDispatchService(mockConnection)
  })

  const baseAction = {
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

  it('should publish and mark actions as dispatched (bulk)', async () => {
    mockFetchUndispatched.mockResolvedValue([baseAction])
    mockPublish.mockResolvedValue(undefined)
    mockMarkAsDispatched.mockResolvedValue(undefined)

    await service.dispatchUndispatchedActions()

    expect(mockFetchUndispatched).toHaveBeenCalledWith(100)
    expect(mockPublish).toHaveBeenCalledWith(
      'graph',
      'task.documents.document.add',
      JSON.stringify({
        id: baseAction.id,
        actionType: ActionType.ADD,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: baseAction.targetUid,
        path: baseAction.path,
        parameters: baseAction.parameters,
        timestamp: baseAction.timestamp.toISOString(),
        personUid: baseAction.personUid,
        application: 'sovisuplus',
      }),
    )
    expect(mockMarkAsDispatched).toHaveBeenCalledWith('a1')
  })

  it('should do nothing when no actions found (bulk)', async () => {
    mockFetchUndispatched.mockResolvedValue([])

    await service.dispatchUndispatchedActions()

    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })

  it('should handle fetch error gracefully (bulk)', async () => {
    mockFetchUndispatched.mockRejectedValue(new Error('DB failure'))

    await expect(service.dispatchUndispatchedActions()).resolves.toBeUndefined()

    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('should handle publish errors and continue (bulk)', async () => {
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

    await service.dispatchUndispatchedActions()

    expect(mockPublish).toHaveBeenCalled()
    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })

  it('should dispatch a FETCH action for a HARVESTING target (bulk)', async () => {
    const action = {
      id: 'fetch-action-1',
      actionType: ActionType.FETCH,
      targetType: ActionTargetType.HARVESTING,
      targetUid: 'person-789',
      path: null,
      parameters: { platforms: ['HAL', 'OPENALEX'] },
      timestamp: new Date('2025-07-31T08:00:00Z'),
      dispatched: false,
      personUid: 'user-fetcher',
    }

    mockFetchUndispatched.mockResolvedValue([action])
    mockPublish.mockResolvedValue(undefined)
    mockMarkAsDispatched.mockResolvedValue(undefined)

    await service.dispatchUndispatchedActions()

    expect(mockFetchUndispatched).toHaveBeenCalledWith(100)
    expect(mockPublish).toHaveBeenCalledWith(
      'graph',
      'task.people.documents.fetch',
      JSON.stringify({
        id: action.id,
        actionType: ActionType.FETCH,
        targetType: ActionTargetType.HARVESTING,
        targetUid: action.targetUid,
        path: action.path,
        parameters: action.parameters,
        timestamp: action.timestamp.toISOString(),
        personUid: action.personUid,
        application: 'sovisuplus',
      }),
    )
    expect(mockMarkAsDispatched).toHaveBeenCalledWith('fetch-action-1')
  })

  it('should route PERSON target to task.people.person.* (bulk)', async () => {
    const personAction = {
      id: 'p1',
      actionType: ActionType.ADD,
      targetType: ActionTargetType.PERSON,
      targetUid: 'person-42',
      path: 'names',
      parameters: { given: 'Ada', family: 'Lovelace' },
      timestamp: new Date('2025-07-20T00:00:00Z'),
      dispatched: false,
      personUid: 'admin',
    }

    mockFetchUndispatched.mockResolvedValue([personAction])
    mockPublish.mockResolvedValue(undefined)
    mockMarkAsDispatched.mockResolvedValue(undefined)

    await service.dispatchUndispatchedActions()

    expect(mockPublish).toHaveBeenCalledWith(
      'graph',
      'task.people.person.add',
      expect.any(String),
    )
  })

  it('dispatchAction(id) should publish and mark as dispatched (single)', async () => {
    const dbRow = {
      ...baseAction,
      dispatched: false,
    }
    const normalized: Action = {
      id: dbRow.id,
      actionType: dbRow.actionType,
      targetType: dbRow.targetType,
      targetUid: dbRow.targetUid,
      path: dbRow.path,
      parameters: dbRow.parameters,
      timestamp: dbRow.timestamp,
      personUid: dbRow.personUid,
      dispatched: dbRow.dispatched,
    }

    mockGetDbActionById.mockResolvedValue(dbRow)
    jest.spyOn(Action, 'fromDbAction').mockReturnValue(normalized)

    mockPublish.mockResolvedValue(undefined)
    mockMarkAsDispatched.mockResolvedValue(undefined)

    await service.dispatchAction(dbRow.id)

    expect(mockGetDbActionById).toHaveBeenCalledWith(dbRow.id)
    expect(mockPublish).toHaveBeenCalledWith(
      'graph',
      'task.documents.document.add',
      JSON.stringify({
        id: normalized.id,
        actionType: normalized.actionType,
        targetType: normalized.targetType,
        targetUid: normalized.targetUid,
        path: normalized.path,
        parameters: normalized.parameters,
        timestamp: normalized.timestamp.toISOString(),
        personUid: normalized.personUid,
        application: 'sovisuplus',
      }),
    )
    expect(mockMarkAsDispatched).toHaveBeenCalledWith(dbRow.id)
  })

  it('dispatchAction(id, skipIfDispatched=true) should skip when already dispatched', async () => {
    const dbRow = { ...baseAction, dispatched: true }
    mockGetDbActionById.mockResolvedValue(dbRow)

    await service.dispatchAction(dbRow.id, true)

    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })

  it('dispatchAction(id) should do nothing when not found', async () => {
    mockGetDbActionById.mockResolvedValue(null)

    await service.dispatchAction('missing-id')

    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })

  it('dispatchAction(id) should propagate publish error and not mark', async () => {
    const dbRow = { ...baseAction, dispatched: false }
    const normalized: Action = {
      id: dbRow.id,
      actionType: dbRow.actionType,
      targetType: dbRow.targetType,
      targetUid: dbRow.targetUid,
      path: dbRow.path,
      parameters: dbRow.parameters,
      timestamp: dbRow.timestamp,
      personUid: dbRow.personUid,
      dispatched: dbRow.dispatched,
    }

    mockGetDbActionById.mockResolvedValue(dbRow)
    jest.spyOn(Action, 'fromDbAction').mockReturnValue(normalized)

    mockPublish.mockRejectedValue(new Error('boom'))

    await expect(service.dispatchAction(dbRow.id)).rejects.toThrow('boom')

    expect(mockMarkAsDispatched).not.toHaveBeenCalled()
  })
})
