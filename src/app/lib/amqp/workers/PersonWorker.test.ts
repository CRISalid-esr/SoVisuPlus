import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import { Person as DbPerson } from '@prisma/client'

jest.mock('@/lib/graphql/PersonGraphQLClient', () => {
  return {
    PersonGraphQLClient: jest.fn().mockImplementation(() => {
      return {
        getPersonByUid: jest.fn(),
      }
    }),
  }
})

jest.mock('@/lib/daos/UserDAO', () => {
  return {
    UserDAO: jest.fn().mockImplementation(() => {
      return {
        createOrUpdateUser: jest.fn(),
      }
    }),
  }
})

jest.mock('@/lib/daos/PersonDAO', () => {
  return {
    PersonDAO: jest.fn().mockImplementation(() => {
      return {
        createOrUpdatePerson: jest.fn(),
      }
    }),
  }
})

const mockGraphQLClient = new PersonGraphQLClient()
const mockUserDAO = new UserDAO()
const mockPersonDAO = new PersonDAO()

describe('PersonWorker', () => {
  let worker: PersonWorker

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process a valid person message and create a user', async () => {
    const message: AMQPPersonMessage = {
      type: 'person',
      event: 'updated',
      fields: {
        uid: 'person-123',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        external: false,
        memberships: [],
        identifiers: [],
      },
    }

    const person: Person = new Person(
      'person-123',
      false,
      'john.doe@example.com',
      'John Doe',
      'John',
      'Doe',
      [],
    )

    const dbPerson: DbPerson = {
      id: 1,
      uid: 'person-123',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      external: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(mockGraphQLClient.getPersonByUid as jest.Mock).mockResolvedValue(person)
    ;(mockPersonDAO.createOrUpdatePerson as jest.Mock).mockResolvedValue(
      dbPerson,
    )

    worker = new PersonWorker(
      message,
      mockPersonDAO,
      mockUserDAO,
      mockGraphQLClient,
    )

    await worker.process()

    expect(mockGraphQLClient.getPersonByUid).toHaveBeenCalledWith('person-123')
    expect(mockPersonDAO.createOrUpdatePerson).toHaveBeenCalledWith(person)
    expect(mockUserDAO.createOrUpdateUser).toHaveBeenCalledWith(1)
  })

  it('should skip user creation for an external person', async () => {
    const message: AMQPPersonMessage = {
      type: 'person',
      event: 'updated',
      fields: {
        uid: 'person-123',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        external: false,
        memberships: [],
        identifiers: [],
      },
    }

    const person: Person = new Person(
      'person-123',
      true,
      'john.doe@example.com',
      'John Doe',
      'John',
      'Doe',
      [],
    )

    const dbPerson: DbPerson = {
      id: 1,
      uid: 'person-123',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      external: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(mockGraphQLClient.getPersonByUid as jest.Mock).mockResolvedValue(person)
    ;(mockPersonDAO.createOrUpdatePerson as jest.Mock).mockResolvedValue(
      dbPerson,
    )

    worker = new PersonWorker(
      message,
      mockPersonDAO,
      mockUserDAO,
      mockGraphQLClient,
    )

    await worker.process()

    expect(mockGraphQLClient.getPersonByUid).toHaveBeenCalledWith('person-123')
    expect(mockPersonDAO.createOrUpdatePerson).toHaveBeenCalledWith(person)
    expect(mockUserDAO.createOrUpdateUser).not.toHaveBeenCalled()
  })

  it('should log and throw an error if processing fails', async () => {
    const message: AMQPPersonMessage = {
      type: 'person',
      event: 'updated',
      fields: {
        uid: 'person-123',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        external: false,
        memberships: [],
        identifiers: [],
      },
    }

    ;(mockGraphQLClient.getPersonByUid as jest.Mock).mockRejectedValue(
      new Error('GraphQL error'),
    )

    worker = new PersonWorker(
      message,
      mockPersonDAO,
      mockUserDAO,
      mockGraphQLClient,
    )

    await expect(worker.process()).rejects.toThrow('GraphQL error')

    expect(mockGraphQLClient.getPersonByUid).toHaveBeenCalledWith('person-123')
    expect(mockPersonDAO.createOrUpdatePerson).not.toHaveBeenCalled()
    expect(mockUserDAO.createOrUpdateUser).not.toHaveBeenCalled()
  })
})
