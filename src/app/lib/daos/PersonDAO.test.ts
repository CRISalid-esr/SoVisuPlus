import { Person as DbPerson, PrismaClient } from '@prisma/client'
import { Person } from '@/types/Person'
import { PersonDAO } from '@/lib/daos/PersonDAO'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    person: {
      upsert: jest.fn(),
    },
    agentIdentifier: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  }
  return { PrismaClient: jest.fn(() => mockPrismaClient) }
})
const mockPrisma = new PrismaClient()
describe('PersonDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should upsert a person', async () => {
    const person: Person = {
      uid: 'local-johndoe',
      external: false,
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

    ;(mockPrisma.person.upsert as jest.Mock).mockResolvedValue(person)
    ;(mockPrisma.agentIdentifier.findMany as jest.Mock).mockResolvedValue([])
    const personDAO = new PersonDAO()
    const dbPerson: DbPerson = await personDAO.createOrUpdatePerson(person)
    expect(dbPerson.uid).toEqual('local-johndoe')
    expect(dbPerson.email).toEqual('johndoe@myuniversity.com')
  })
})
