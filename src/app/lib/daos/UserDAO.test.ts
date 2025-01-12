import { User as DbUser, PrismaClient } from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { UserDAO } from '@/lib/daos/UserDAO'

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

  it('should fetch a user by identifier', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 2,
      personId: 123,
      person: {
        id: 123,
        uid: 'local-johndoe',
        email: 'johndoe@myuniversity.com',
      },
    })

    const dbUser: DbUser | null = await userDAO.getUserByIdentifier(identifier)
    expect(dbUser).not.toBeNull()
    expect(dbUser?.id).toEqual(2)
    expect(dbUser?.personId).toEqual(123)
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
      include: { person: true },
    })
  })

  it('should return null if user not found by identifier', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null)

    const dbUser: DbUser | null = await userDAO.getUserByIdentifier(identifier)
    expect(dbUser).toBeNull()
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
      include: { person: true },
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

  it('should throw an error if fetching user by identifier fails', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    await expect(userDAO.getUserByIdentifier(identifier)).rejects.toThrow(
      'Failed to fetch user by identifier: Database error',
    )
  })
})
