import { ActionTargetType, ActionType, PrismaClient } from '@prisma/client'
import { ActionDAO } from './ActionDAO'
import { Action } from '@/types/Action'

jest.mock('@prisma/client', () => {
  const actualPrismaClient = jest.requireActual('@prisma/client')
  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => ({
      action: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    })),
  }
})

const mockPrisma = new PrismaClient()

describe('ActionDAO', () => {
  let dao: ActionDAO

  beforeEach(() => {
    jest.clearAllMocks()
    dao = new ActionDAO()
    dao['prismaClient'] = mockPrisma
  })

  const baseActionData = {
    id: 'action-uuid',
    actionType: ActionType.ADD,
    targetType: ActionTargetType.DOCUMENT,
    targetUid: 'doc-001',
    path: 'titles',
    parameters: { language: 'fr', value: 'Titre' },
    personUid: 'person-001',
    timestamp: new Date('2025-07-10T12:00:00.000Z'),
    dispatched: false,
  }

  it('should create an ADD action for a DOCUMENT target', async () => {
    ;(mockPrisma.action.create as jest.Mock).mockResolvedValue(baseActionData)

    const action = await dao.createAction({
      actionType: ActionType.ADD,
      targetType: ActionTargetType.DOCUMENT,
      targetUid: 'doc-001',
      path: 'titles',
      parameters: { language: 'fr', value: 'Titre' },
      personUid: 'person-001',
    })

    expect(action).toBeInstanceOf(Action)
    expect(action.id).toBe(baseActionData.id)
    expect(mockPrisma.action.create).toHaveBeenCalledWith({
      data: {
        actionType: ActionType.ADD,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: 'doc-001',
        path: 'titles',
        parameters: { language: 'fr', value: 'Titre' },
        personUid: 'person-001',
      },
    })
  })

  it('should fetch undispatched actions', async () => {
    ;(mockPrisma.action.findMany as jest.Mock).mockResolvedValue([
      baseActionData,
    ])

    const actions = await dao.fetchUndispatchedActions()

    expect(actions).toHaveLength(1)
    expect(actions[0]).toBeInstanceOf(Action)
    expect(mockPrisma.action.findMany).toHaveBeenCalledWith({
      where: { dispatched: false },
      orderBy: { timestamp: 'asc' },
      take: 100,
    })
  })

  it('should mark an action as dispatched', async () => {
    ;(mockPrisma.action.update as jest.Mock).mockResolvedValue({
      ...baseActionData,
      dispatched: true,
    })

    await dao.markActionAsDispatched('action-uuid')

    expect(mockPrisma.action.update).toHaveBeenCalledWith({
      where: { id: 'action-uuid' },
      data: { dispatched: true },
    })
  })

  it('should mark multiple actions as dispatched', async () => {
    ;(mockPrisma.action.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

    await dao.markActionsAsDispatched(['action-1', 'action-2'])

    expect(mockPrisma.action.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['action-1', 'action-2'] } },
      data: { dispatched: true },
    })
  })

  it('should create a FETCH action for a PERSON target', async () => {
    const fetchActionData = {
      ...baseActionData,
      actionType: ActionType.FETCH,
      targetType: ActionTargetType.HARVESTING,
      targetUid: 'person-999',
      parameters: { platforms: ['HAL', 'OPENALEX'] },
    }

    ;(mockPrisma.action.create as jest.Mock).mockResolvedValue(fetchActionData)

    const action = await dao.createAction({
      actionType: ActionType.FETCH,
      targetType: ActionTargetType.HARVESTING,
      targetUid: 'person-999',
      parameters: { platforms: ['HAL', 'OPENALEX'] },
      personUid: 'person-001',
    })

    expect(action).toBeInstanceOf(Action)
    expect(action.actionType).toBe(ActionType.FETCH)
    expect(action.targetType).toBe(ActionTargetType.HARVESTING)
    expect(action.targetUid).toBe('person-999')
    expect(action.parameters).toEqual({ platforms: ['HAL', 'OPENALEX'] })

    expect(mockPrisma.action.create).toHaveBeenCalledWith({
      data: {
        actionType: ActionType.FETCH,
        targetType: ActionTargetType.HARVESTING,
        targetUid: 'person-999',
        path: null,
        parameters: { platforms: ['HAL', 'OPENALEX'] },
        personUid: 'person-001',
      },
    })
  })
})
