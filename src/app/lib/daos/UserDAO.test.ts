import { EntityType, PrismaClient, User as DbUser } from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { UserDAO } from '@/lib/daos/UserDAO'
import { User } from '@/types/User'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    person: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    userRole: {
      upsert: jest.fn(),
    },
    userRoleScope: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    personIdentifier: {
      findMany: jest.fn(),
    },
  }
  return { PrismaClient: jest.fn(() => mockPrismaClient) }
})
const mockPrisma = new PrismaClient()

describe('UserDAO', () => {
  let userDAO: UserDAO
  beforeEach(() => {
    jest.clearAllMocks()
    userDAO = new UserDAO()
  })

  const identifier: PersonIdentifier = {
    type: 'ORCID',
    value: '0000-0001-2345-6789',
  }

  it('should upsert a user', async () => {
    ;(mockPrisma.user.upsert as jest.Mock).mockResolvedValue({
      id: 1,
      personId: 123,
    })

    const dbUser: DbUser = await userDAO.createOrUpdateUser(123)
    expect(dbUser.id).toEqual(1)
    expect(dbUser.personId).toEqual(123)
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { personId: 123 },
      update: {},
      create: { personId: 123 },
    })
  })

  it('should fetch a user by identifier (including roles & scopes)', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 2,
      personId: 123,
      person: {
        id: 123,
        uid: 'local-johndoe',
        email: 'johndoe@myuniversity.com',
        identifiers: [],
        memberships: [],
      },
      roles: [
        {
          role: {
            id: 10,
            name: 'restricted_editor',
            description: null,
            system: false,
          },
          scopes: [
            {
              entityType: 'ResearchStructure',
              entityUid: 'rs-uid-1',
            },
            { entityType: 'Institution', entityUid: 'inst-uid-42' },
          ],
        },
      ],
    })

    const user: User | null = await userDAO.getUserByIdentifier(identifier)
    expect(user).not.toBeNull()
    expect(user?.person?.uid).toEqual('local-johndoe')

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        person: {
          identifiers: {
            some: {
              type: 'ORCID',
              value: '0000-0001-2345-6789',
            },
          },
        },
      },
      include: {
        person: {
          include: {
            identifiers: true,
            memberships: {
              select: {
                startDate: true,
                endDate: true,
                researchStructure: {
                  select: {
                    uid: true,
                    acronym: true,
                    signature: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        roles: {
          include: {
            role: {
              select: { id: true, name: true, description: true, system: true },
            },
            scopes: {
              select: {
                entityType: true,
                entityUid: true,
              },
            },
          },
        },
      },
    })
  })

  it('should return null if user not found by identifier', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null)

    const user: User | null = await userDAO.getUserByIdentifier(identifier)
    expect(user).toBeNull()

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        person: {
          identifiers: {
            some: { type: 'ORCID', value: '0000-0001-2345-6789' },
          },
        },
      },
      include: {
        person: {
          include: {
            identifiers: true,
            memberships: {
              select: {
                startDate: true,
                endDate: true,
                positionCode: true,
                researchStructure: {
                  select: {
                    uid: true,
                    id: true,
                    acronym: true,
                    signature: true,
                    slug: true,
                    external: true,
                  },
                },
              },
            },
          },
        },
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: {
                      select: {
                        id: true,
                        action: true,
                        subject: true,
                        fields: true,
                        inverted: true,
                      },
                    },
                  },
                },
              },
            },
            scopes: {
              select: {
                entityType: true,
                entityUid: true,
              },
            },
          },
        },
      },
    })
  })

  it('should throw an error if upsert fails', async () => {
    ;(mockPrisma.user.upsert as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    await expect(userDAO.createOrUpdateUser(123)).rejects.toThrow(
      'Failed to upsert user: Database error',
    )
  })

  it('should handle error and return null when fetching user by identifier fails', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    await expect(userDAO.getUserByIdentifier(identifier)).resolves.toBeNull()
  })

  it('resolveUserId: returns id when userId exists', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 77 })
    const id = await userDAO.resolveUserId({ userId: 77 })
    expect(id).toBe(77)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 77 },
      select: { id: true },
    })
  })

  it('resolveUserId: returns null when userId does not exist', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    const id = await userDAO.resolveUserId({ userId: 999 })
    expect(id).toBeNull()
  })

  it('resolveUserId: via personUid returns user id when both exist', async () => {
    ;(mockPrisma.person.findUnique as jest.Mock).mockResolvedValue({ id: 5 })
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 88,
    })
    const id = await userDAO.resolveUserId({ personUid: 'local-jane' })
    expect(id).toBe(88)
    expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
      where: { uid: 'local-jane' },
      select: { id: true },
    })
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { personId: 5 },
      select: { id: true },
    })
  })

  it('resolveUserId: via personUid returns null when person not found', async () => {
    ;(mockPrisma.person.findUnique as jest.Mock).mockResolvedValue(null)
    const id = await userDAO.resolveUserId({ personUid: 'missing' })
    expect(id).toBeNull()
  })

  it('resolveUserId: via personUid returns null when user not found', async () => {
    ;(mockPrisma.person.findUnique as jest.Mock).mockResolvedValue({ id: 5 })
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
    const id = await userDAO.resolveUserId({ personUid: 'local-jane' })
    expect(id).toBeNull()
  })

  it('resolveUserId: via identifier returns user id when person + user exist', async () => {
    ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue({ id: 4 })
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 66,
    })
    const id = await userDAO.resolveUserId({
      idType: 'ORCID',
      idValue: '0000-0001-2345-6789',
    })
    expect(id).toBe(66)
    expect(mockPrisma.person.findFirst).toHaveBeenCalledWith({
      where: {
        identifiers: { some: { type: 'ORCID', value: '0000-0001-2345-6789' } },
      },
      select: { id: true },
    })
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { personId: 4 },
      select: { id: true },
    })
  })

  it('resolveUserId: via identifier returns null when person not found', async () => {
    ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue(null)
    const id = await userDAO.resolveUserId({
      idType: 'ORCID',
      idValue: 'missing',
    })
    expect(id).toBeNull()
  })

  it('resolveUserId: via identifier returns null when user not found', async () => {
    ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue({ id: 4 })
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
    const id = await userDAO.resolveUserId({
      idType: 'ORCID',
      idValue: '0000-0001-2345-6789',
    })
    expect(id).toBeNull()
  })

  it('createUserRoleIfNotExists: upserts on composite key', async () => {
    ;(mockPrisma.userRole.upsert as jest.Mock).mockResolvedValue({
      userId: 7,
      roleId: 3,
    })
    await userDAO.createUserRoleIfNotExists(7, 3)
    expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: 7, roleId: 3 } },
      update: {},
      create: { userId: 7, roleId: 3 },
    })
  })

  it('createUserRoleScopeIfNotExists: upserts on composite unique key', async () => {
    ;(mockPrisma.userRoleScope.upsert as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 7,
      roleId: 3,
      entityType: 'ResearchStructure',
      entityUid: 'rs-uid-1',
    })
    await userDAO.createUserRoleScopeIfNotExists(
      7,
      3,
      'ResearchStructure' as EntityType,
      'rs-uid-1',
    )
    expect(mockPrisma.userRoleScope.upsert).toHaveBeenCalledWith({
      where: {
        userId_roleId_entityType_entityUid: {
          userId: 7,
          roleId: 3,
          entityType: 'ResearchStructure',
          entityUid: 'rs-uid-1',
        },
      },
      update: {},
      create: {
        userId: 7,
        roleId: 3,
        entityType: 'ResearchStructure',
        entityUid: 'rs-uid-1',
      },
    })
  })

  it('deleteUserRoleScopes: deletes all scopes for user/role', async () => {
    ;(mockPrisma.userRoleScope.deleteMany as jest.Mock).mockResolvedValue({
      count: 2,
    })
    await userDAO.deleteUserRoleScopes(7, 3)
    expect(mockPrisma.userRoleScope.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7, roleId: 3 },
    })
  })
})
