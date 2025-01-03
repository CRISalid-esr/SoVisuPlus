import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { Person } from '@/types/Person'

const createMockPersonGraphQLClient = (
  isEnabled: boolean,
  personData: Person,
): jest.Mocked<PersonGraphQLClient> =>
  ({
    isEnabled: jest.fn().mockReturnValue(isEnabled),
    getPerson: jest.fn().mockResolvedValue(personData),
  }) as unknown as jest.Mocked<PersonGraphQLClient> // not to be forced to implement all methods

const createMockUserDAO = (userData: {
  id: number
  username: string
  email: string
}): jest.Mocked<UserDAO> =>
  ({
    createOrUpdateUserFor: jest.fn().mockResolvedValue(undefined), // Simulate a void return
    getUserByIdentifier: jest.fn().mockResolvedValue(userData),
  }) as unknown as jest.Mocked<UserDAO> // not to be forced to implement all methods

describe('UserService', () => {
  let userService: UserService
  let personGraphQLClientMock: jest.Mocked<PersonGraphQLClient>
  let userDAOMock: jest.Mocked<UserDAO>

  beforeEach(() => {
    personGraphQLClientMock = createMockPersonGraphQLClient(true, {
      uid: 'local-johndoe',
      email: 'johndo@university.edu',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      identifiers: [{ type: 'ORCID', value: '0000-0001-2345-6789' }],
    })

    userDAOMock = createMockUserDAO({
      id: 1,
      username: 'local-johndoe',
      email: 'johndo@university.edu',
    })

    userService = new UserService(personGraphQLClientMock, userDAOMock)
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
    expect(personGraphQLClientMock.getPerson).toHaveBeenCalledWith({
      type: 'local',
      value: 'local-johndoe',
    })
    expect(userDAOMock.createOrUpdateUserFor).toHaveBeenCalledWith({
      uid: 'local-johndoe',
      email: 'johndo@university.edu',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      identifiers: [{ type: 'ORCID', value: '0000-0001-2345-6789' }],
    })
  })

  it('should return true if the user is found in the database', async () => {
    const profile: AuthenticationProfile = { username: 'local-johndoe' }

    personGraphQLClientMock.isEnabled.mockReturnValue(false)

    const result = await userService.submitProfile(profile)
    expect(result).toBe(true)

    expect(userDAOMock.getUserByIdentifier).toHaveBeenCalledWith({
      type: 'local',
      value: 'local-johndoe',
    })
  })
})
