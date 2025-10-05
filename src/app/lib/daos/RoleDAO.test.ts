import { PrismaClient, Permission, Role } from '@prisma/client'
import { RoleDAO } from '@/lib/daos/RoleDAO'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    role: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    rolePermission: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    permission: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  }
  return { PrismaClient: jest.fn(() => mockPrismaClient) }
})
const mockPrisma = new PrismaClient()

describe('RoleDAO', () => {
  let dao: RoleDAO

  beforeEach(() => {
    jest.clearAllMocks()
    dao = new RoleDAO()
  })

  it('upsertRole: should create or update a role', async () => {
    ;(mockPrisma.role.upsert as jest.Mock).mockResolvedValue({
      id: 42,
      name: 'document_editor',
      description: 'Edit document metadata globally',
      system: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Role)

    const result = await dao.upsertRole('document_editor', {
      description: 'Edit document metadata globally',
      system: false,
    })

    expect(result.id).toBe(42)
    expect(mockPrisma.role.upsert).toHaveBeenCalledWith({
      where: { name: 'document_editor' },
      update: { description: 'Edit document metadata globally', system: false },
      create: {
        name: 'document_editor',
        description: 'Edit document metadata globally',
        system: false,
      },
    })
  })

  it('getRoleByName: should fetch role with permission ids', async () => {
    ;(mockPrisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: 7,
      name: 'document_merger',
      description: 'Merge / unmerge documents',
      system: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [{ permissionId: 1 }, { permissionId: 2 }],
    })

    const result = await dao.getRoleByName('document_merger')

    expect(result).not.toBeNull()
    expect(result?.name).toBe('document_merger')

    expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
      where: { name: 'document_merger' },
    })
  })

  it('setRolePermissions: should add missing and remove extra permissions', async () => {
    // Current: {1, 2}; Desired: {2, 3} => add 3, remove 1
    ;(mockPrisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 9,
      permissions: [{ permissionId: 1 }, { permissionId: 2 }],
    })

    await dao.setRolePermissions(9, [2, 3])

    expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 9, permissionId: 3 }],
      skipDuplicates: true,
    })
    expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { roleId: 9, permissionId: 1 },
    })
    // Should only delete once
    expect(
      (mockPrisma.rolePermission.deleteMany as jest.Mock).mock.calls,
    ).toHaveLength(1)
  })

  it('findOrCreatePermission: returns existing permission when found', async () => {
    const existing: Permission = {
      id: 11,
      action: 'update',
      subject: 'Document',
      fields: ['titles', 'abstracts'],
      inverted: false,
      conditions: null,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    ;(mockPrisma.permission.findFirst as jest.Mock).mockResolvedValue(existing)

    const result = await dao.findOrCreatePermission({
      action: 'update',
      subject: 'Document',
      inverted: false,
      fields: ['titles', 'abstracts'],
      description: null,
    })

    expect(result).toBe(existing)
    expect(mockPrisma.permission.findFirst).toHaveBeenCalledWith({
      where: {
        action: 'update',
        subject: 'Document',
        inverted: false,
        fields: { equals: ['titles', 'abstracts'] },
      },
    })
    expect(mockPrisma.permission.create).not.toHaveBeenCalled()
  })

  it('findOrCreatePermission: creates permission when not found', async () => {
    ;(mockPrisma.permission.findFirst as jest.Mock).mockResolvedValue(null)

    const created: Permission = {
      id: 12,
      action: 'merge',
      subject: 'Document',
      fields: [],
      inverted: false,
      conditions: null,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    ;(mockPrisma.permission.create as jest.Mock).mockResolvedValue(created)

    const result = await dao.findOrCreatePermission({
      action: 'merge',
      subject: 'Document',
      fields: [],
      inverted: false,
      description: null,
    })

    expect(result).toBe(created)
    expect(mockPrisma.permission.findFirst).toHaveBeenCalledWith({
      where: {
        action: 'merge',
        subject: 'Document',
        inverted: false,
        fields: { equals: [] },
      },
    })
    expect(mockPrisma.permission.create).toHaveBeenCalledWith({
      data: {
        action: 'merge',
        subject: 'Document',
        inverted: false,
        fields: [],
        conditions: undefined,
        description: null,
      },
    })
  })
})
