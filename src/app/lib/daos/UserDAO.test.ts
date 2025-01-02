import { PrismaClient, User } from '@prisma/client'
import { Person } from '@/types/Person'
import { UserDAO } from '@/lib/daos/UserDAO'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
  }
  return { PrismaClient: jest.fn(() => mockPrismaClient) }
})
const mockPrisma = new PrismaClient()
describe('UserDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should upsert a user', async () => {
    const person: Person = {
      uid: 'local-johndoe',
      email: 'johndoe@myuniversity.com',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      identifiers: [
        {
          type: 'ORCID',
          value: '0000-0001-2345-6789',
        },
      ],
    }
    const expectedUser = {
      person_uid: 'local-johndoe',
      email: 'johndoe@myuniversity.com',
    }

    ;(mockPrisma.user.upsert as jest.Mock).mockResolvedValue(expectedUser)
    const userDAO = new UserDAO()
    const user: User = await userDAO.createOrUpdateUserFor(person)
    expect(user).toEqual(expectedUser)
  })
})
