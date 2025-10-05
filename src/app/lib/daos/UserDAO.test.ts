import { PrismaClient, User as DbUser } from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { UserDAO } from '@/lib/daos/UserDAO'
import { User } from '@/types/User'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
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
})
