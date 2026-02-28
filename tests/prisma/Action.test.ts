import prisma from '@/lib/daos/prisma'
import { ActionTargetType, ActionType } from '@prisma/client'

describe('Action Model Tests', () => {
  beforeEach(async () => {
    await prisma.action.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create a new change entry', async () => {
    const action = await prisma.action.create({
      data: {
        actionType: ActionType.ADD,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: 'doc-123',
        path: 'titles',
        parameters: { language: 'fr', value: 'Titre mis à jour' },
        personUid: 'person-456',
        timestamp: new Date(),
      },
    })

    expect(action).toHaveProperty('id')
    expect(action.actionType).toBe(ActionType.ADD)
    expect(action.targetType).toBe(ActionTargetType.DOCUMENT)
    expect(action.targetUid).toBe('doc-123')
    expect(action.path).toBe('titles')
    expect(action.parameters).toMatchObject({
      language: 'fr',
      value: 'Titre mis à jour',
    })
    expect(action.timestamp).toBeInstanceOf(Date)
  })

  test('should retrieve a change by id', async () => {
    const created = await prisma.action.create({
      data: {
        actionType: ActionType.UPDATE,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: 'doc-999',
        path: 'abstracts',
        parameters: {
          before: 'Old abstract',
          after: 'New abstract',
        },
        personUid: 'person-123',
        timestamp: new Date(),
      },
    })

    const found = await prisma.action.findUnique({
      where: { id: created.id },
    })

    expect(found).not.toBeNull()
    expect(found?.id).toBe(created.id)
    expect(found?.actionType).toBe(ActionType.UPDATE)
    expect(found?.targetUid).toBe('doc-999')
    expect(found?.parameters).toMatchObject({
      before: 'Old abstract',
      after: 'New abstract',
    })
  })

  test('should create multiple changes and filter by action', async () => {
    await prisma.action.createMany({
      data: [
        {
          id: 'change-1',
          actionType: ActionType.ADD,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: 'doc-001',
          parameters: {},
          path: 'subjects',
          personUid: 'person-001',
        },
        {
          id: 'change-2',
          actionType: ActionType.REMOVE,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: 'doc-002',
          parameters: {},
          path: 'titles',
          personUid: 'person-002',
        },
      ],
    })

    const addActions = await prisma.action.findMany({
      where: { actionType: ActionType.ADD },
    })

    expect(addActions).toHaveLength(1)
    expect(addActions[0].id).toBe('change-1')
  })
})
