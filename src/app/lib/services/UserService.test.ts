import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { Person } from '@/types/Person'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person as DbPerson, User as DbUser } from '@prisma/client'

const createMockPersonGraphQLClient = (
  isEnabled: boolean,
  personData: Person,
): jest.Mocked<PersonGraphQLClient> =>
  ({
    isEnabled: jest.fn().mockReturnValue(isEnabled),
    getPersonByIdentifier: jest.fn().mockResolvedValue(personData),
  }) as unknown as jest.Mocked<PersonGraphQLClient> // not to be forced to implement all methods

const createMockUserDAO = (userData: DbUser): jest.Mocked<UserDAO> =>
  ({
    createOrUpdateUser: jest.fn().mockResolvedValue(undefined), // Simulate a void return
    getUserByIdentifier: jest.fn().mockResolvedValue(userData),
  }) as unknown as jest.Mocked<UserDAO> // not to be forced to implement all methods

const createMockPersonDAO = (personData: DbPerson): jest.Mocked<PersonDAO> =>
  ({
    createOrUpdatePerson: jest.fn().mockResolvedValue(personData),
  }) as unknown as jest.Mocked<PersonDAO> // not to be forced to implement all methods

describe('UserService', () => {
  let userService: UserService
  let personGraphQLClientMock: jest.Mocked<PersonGraphQLClient>
  let userDAOMock: jest.Mocked<UserDAO>
  let personDAOMock: jest.Mocked<PersonDAO>

  beforeEach(() => {
    personGraphQLClientMock = createMockPersonGraphQLClient(
      true,
      new Person(
        'local-johndoe',
        false,
        'johndo@university.edu',
        'John',
        'Doe',
        'John Doe',
        [{ type: 'ORCID', value: '0000-0001-2345-6789' }],
      ),
    )

    userDAOMock = createMockUserDAO({
      id: 1,
      personId: 1,
    })

    personDAOMock = createMockPersonDAO({
      id: 1,
      uid: 'local-johndoe',
      external: false,
      email: 'johndo@university.edu',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    userService = new UserService(
      personGraphQLClientMock,
      userDAOMock,
      personDAOMock,
    )
  })

  it('should return false if no valid identifier is provided', async () => {
    const profile: AuthenticationProfile = { email: 'johndo@university.edu' }
    const result = await userService.submitProfile(profile)
    expect(result).toBe(false)
  })

  it('should return true if the user is found in the graph API', async () => {
    const profile: AuthenticationProfile = { username: 'local-johndoe' }
    const result = await userService.submitProfile(profile)
    expect(result).toBe(true)

    expect(personGraphQLClientMock.isEnabled).toHaveBeenCalled()
    expect(personGraphQLClientMock.getPersonByIdentifier).toHaveBeenCalledWith({
      type: 'LOCAL',
      value: 'local-johndoe',
    })
    expect(userDAOMock.createOrUpdateUser).toHaveBeenCalledWith(1)
  })

  it('should return true if the user is found in the database', async () => {
    const profile: AuthenticationProfile = { username: 'local-johndoe' }

    personGraphQLClientMock.isEnabled.mockReturnValue(false)

    const result = await userService.submitProfile(profile)
    expect(result).toBe(true)

    expect(userDAOMock.getUserByIdentifier).toHaveBeenCalledWith({
      type: 'LOCAL',
      value: 'local-johndoe',
    })
  })
})
