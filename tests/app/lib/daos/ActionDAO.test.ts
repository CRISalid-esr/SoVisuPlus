import { ActionDAO } from '@/lib/daos/ActionDAO'
import prisma from '@/lib/daos/prisma'
import { ActionType, ActionTargetType } from '@prisma/client'

describe('ActionDAO Integration Tests', () => {
  const dao = new ActionDAO()

  afterEach(async () => {
    await prisma.action.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should create an action', async () => {
    const action = await dao.createAction({
      actionType: ActionType.ADD,
      targetType: ActionTargetType.DOCUMENT,
      targetUid: 'doc-001',
      path: 'titles',
      parameters: { language: 'en', value: 'New title' },
      personUid: 'person-123',
    })

    const dbAction = await prisma.action.findUnique({
      where: { id: action.id },
    })

    expect(dbAction).not.toBeNull()
    expect(dbAction?.targetUid).toBe('doc-001')
    expect(dbAction?.dispatched).toBe(false)
  })

  it('should fetch undispatched actions', async () => {
    await prisma.action.createMany({
      data: [
        {
          id: 'a1',
          actionType: 'ADD',
          targetType: 'DOCUMENT',
          targetUid: 'doc-1',
          parameters: {},
          personUid: 'user-1',
          dispatched: false,
          timestamp: new Date(),
        },
        {
          id: 'a2',
          actionType: 'REMOVE',
          targetType: 'DOCUMENT',
          targetUid: 'doc-2',
          parameters: {},
          personUid: 'user-2',
          dispatched: true,
          timestamp: new Date(),
        },
      ],
    })

    const results = await dao.fetchUndispatchedActions()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('a1')
  })

  it('should mark a single action as dispatched', async () => {
    const action = await prisma.action.create({
      data: {
        id: 'a3',
        actionType: 'UPDATE',
        targetType: 'DOCUMENT',
        targetUid: 'doc-3',
        parameters: {},
        personUid: 'user-3',
        dispatched: false,
        timestamp: new Date(),
      },
    })

    await dao.markActionAsDispatched(action.id)

    const updated = await prisma.action.findUnique({ where: { id: action.id } })
    expect(updated?.dispatched).toBe(true)
  })

  it('should mark multiple actions as dispatched', async () => {
    await prisma.action.createMany({
      data: [
        {
          id: 'a4',
          actionType: 'ADD',
          targetType: 'DOCUMENT',
          targetUid: 'doc-4',
          parameters: {},
          personUid: 'user-4',
          dispatched: false,
          timestamp: new Date(),
        },
        {
          id: 'a5',
          actionType: 'REMOVE',
          targetType: 'DOCUMENT',
          targetUid: 'doc-5',
          parameters: {},
          personUid: 'user-5',
          dispatched: false,
          timestamp: new Date(),
        },
      ],
    })

    await dao.markActionsAsDispatched(['a4', 'a5'])

    const actions = await prisma.action.findMany({
      where: { id: { in: ['a4', 'a5'] } },
    })

    expect(actions.every((a) => a.dispatched)).toBe(true)
  })
})
