// file: tests/prisma/Change.test.ts
import prisma from '@/lib/daos/prisma'
import { ChangeAction, ChangeTargetType } from '@prisma/client'

describe('Change Model Tests', () => {
  beforeEach(async () => {
    await prisma.change.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create a new change entry', async () => {
    const change = await prisma.change.create({
      data: {
        action: ChangeAction.ADD,
        targetType: ChangeTargetType.DOCUMENT,
        targetUid: 'doc-123',
        path: 'titles',
        parameters: { language: 'fr', value: 'Titre mis à jour' },
      },
    })

    expect(change).toHaveProperty('id')
    expect(change.action).toBe(ChangeAction.ADD)
    expect(change.targetType).toBe(ChangeTargetType.DOCUMENT)
    expect(change.targetUid).toBe('doc-123')
    expect(change.path).toBe('titles')
    expect(change.parameters).toMatchObject({
      language: 'fr',
      value: 'Titre mis à jour',
    })
    expect(change.timestamp).toBeInstanceOf(Date)
  })

  test('should retrieve a change by id', async () => {
    const created = await prisma.change.create({
      data: {
        action: ChangeAction.UPDATE,
        targetType: ChangeTargetType.DOCUMENT,
        targetUid: 'doc-999',
        path: 'abstracts',
        parameters: {
          before: 'Old abstract',
          after: 'New abstract',
        },
      },
    })

    const found = await prisma.change.findUnique({
      where: { id: created.id },
    })

    expect(found).not.toBeNull()
    expect(found?.id).toBe(created.id)
    expect(found?.action).toBe(ChangeAction.UPDATE)
    expect(found?.targetUid).toBe('doc-999')
    expect(found?.parameters).toMatchObject({
      before: 'Old abstract',
      after: 'New abstract',
    })
  })

  test('should create multiple changes and filter by action', async () => {
    await prisma.change.createMany({
      data: [
        {
          id: 'change-1',
          action: ChangeAction.ADD,
          targetType: ChangeTargetType.DOCUMENT,
          targetUid: 'doc-001',
          parameters: {},
        },
        {
          id: 'change-2',
          action: ChangeAction.REMOVE,
          targetType: ChangeTargetType.DOCUMENT,
          targetUid: 'doc-002',
          parameters: {},
        },
      ],
    })

    const addedChanges = await prisma.change.findMany({
      where: { action: ChangeAction.ADD },
    })

    expect(addedChanges).toHaveLength(1)
    expect(addedChanges[0].id).toBe('change-1')
  })
})
