// file: src/app/lib/daos/ChangeDAO.test.ts
import { PrismaClient, ChangeAction, ChangeTargetType } from '@prisma/client'
import { ChangeDAO } from './ChangeDAO'
import { Change } from '@/types/Change'

jest.mock('@prisma/client', () => {
  const actualPrismaClient = jest.requireActual('@prisma/client')
  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => ({
      change: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    })),
  }
})

const mockPrisma = new PrismaClient()

describe('ChangeDAO', () => {
  let dao: ChangeDAO

  beforeEach(() => {
    jest.clearAllMocks()
    dao = new ChangeDAO()
    dao['prismaClient'] = mockPrisma
  })

  const baseChangeData = {
    id: 'change-uuid',
    action: ChangeAction.ADD,
    targetType: ChangeTargetType.DOCUMENT,
    targetUid: 'doc-001',
    path: 'titles',
    parameters: { language: 'fr', value: 'Titre' },
    personUid: 'person-001',
    timestamp: new Date('2025-07-10T12:00:00.000Z'),
    dispatched: false,
  }

  it('should create a change', async () => {
    ;(mockPrisma.change.create as jest.Mock).mockResolvedValue(baseChangeData)

    const change = await dao.createChange({
      action: ChangeAction.ADD,
      targetType: ChangeTargetType.DOCUMENT,
      targetUid: 'doc-001',
      path: 'titles',
      parameters: { language: 'fr', value: 'Titre' },
      personUid: 'person-001',
    })

    expect(change).toBeInstanceOf(Change)
    expect(change.id).toBe(baseChangeData.id)
    expect(mockPrisma.change.create).toHaveBeenCalledWith({
      data: {
        action: ChangeAction.ADD,
        targetType: ChangeTargetType.DOCUMENT,
        targetUid: 'doc-001',
        path: 'titles',
        parameters: { language: 'fr', value: 'Titre' },
        personUid: 'person-001',
      },
    })
  })

  it('should fetch undispatched changes', async () => {
    ;(mockPrisma.change.findMany as jest.Mock).mockResolvedValue([
      baseChangeData,
    ])

    const changes = await dao.fetchUndispatchedChanges()

    expect(changes).toHaveLength(1)
    expect(changes[0]).toBeInstanceOf(Change)
    expect(mockPrisma.change.findMany).toHaveBeenCalledWith({
      where: { dispatched: false },
      orderBy: { timestamp: 'asc' },
      take: 100,
    })
  })

  it('should mark a change as dispatched', async () => {
    ;(mockPrisma.change.update as jest.Mock).mockResolvedValue({
      ...baseChangeData,
      dispatched: true,
    })

    await dao.markChangeAsDispatched('change-uuid')

    expect(mockPrisma.change.update).toHaveBeenCalledWith({
      where: { id: 'change-uuid' },
      data: { dispatched: true },
    })
  })

  it('should mark multiple changes as dispatched', async () => {
    ;(mockPrisma.change.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

    await dao.markChangesAsDispatched(['change-1', 'change-2'])

    expect(mockPrisma.change.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['change-1', 'change-2'] } },
      data: { dispatched: true },
    })
  })
})
