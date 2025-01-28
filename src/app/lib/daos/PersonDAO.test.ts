import { Person as DbPerson, PrismaClient } from '@prisma/client'
import { Person } from '@/types/Person'
import { PersonDAO } from '@/lib/daos/PersonDAO'

jest.mock('@prisma/client', () => {
  // avoid PersonIdentifierType to be mocked
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')

  const mockPrismaClient = {
    person: {
      upsert: jest.fn(),
    },
    personIdentifier: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  }

  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})
const mockPrisma = new PrismaClient()

describe('PersonDAO', () => {
  let personDAO: PersonDAO
  beforeEach(() => {
    jest.clearAllMocks()
    personDAO = new PersonDAO()
  })

  const person: Person = new Person(
    'local-johndoe',
    false,
    'johndoe@myuniversity.com',
    'John',
    'Doe',
    'John Doe',
    [{ type: 'ORCID', value: '0000-0001-2345-6789' }],
  )

  it('should upsert a person', async () => {
    ;(mockPrisma.person.upsert as jest.Mock).mockResolvedValue({
      ...person,
      id: 1,
    })
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([])
    const dbPerson: DbPerson = await personDAO.createOrUpdatePerson(person)
    expect(dbPerson.uid).toEqual('local-johndoe')
    expect(dbPerson.email).toEqual('johndoe@myuniversity.com')
    expect(mockPrisma.person.upsert).toHaveBeenCalledWith({
      where: { uid: person.uid },
      update: {
        email: person.email,
        displayName: person.displayName,
        firstName: person.firstName,
        lastName: person.lastName,
        external: person.external,
      },
      create: {
        uid: person.uid,
        email: person.email,
        displayName: person.displayName,
        firstName: person.firstName,
        lastName: person.lastName,
        external: person.external,
      },
    })

    expect(mockPrisma.personIdentifier.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            type: 'ORCID',
            value: '0000-0001-2345-6789',
            personId: { not: 1 },
          },
        ],
      },
    })
  })

  it('should throw an error if conflicting identifiers are found', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([
      { type: 'ORCID', value: '0000-0001-2345-6789', personId: 999 },
    ])

    await expect(personDAO.createOrUpdatePerson(person)).rejects.toThrow(
      'Conflicting identifiers found: ORCID:0000-0001-2345-6789',
    )
  })

  it('should call deleteMany and createMany for upsertIdentifiers', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([])

    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.personIdentifier.deleteMany).toHaveBeenCalledWith({
      where: { personId: expect.any(Number) },
    })

    expect(mockPrisma.personIdentifier.createMany).toHaveBeenCalledWith({
      data: [
        {
          personId: expect.any(Number),
          type: 'ORCID',
          value: '0000-0001-2345-6789',
        },
      ],
    })
  })
})
