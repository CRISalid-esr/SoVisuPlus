import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { UserDAO } from '@/lib/daos/UserDAO'
import { User as DbUser } from '@prisma/client'

jest.mock('@/lib/daos/UserDAO')

describe('UserService', () => {
  let userService: UserService
  let userDAOMock: {
    getUserByIdentifier: jest.Mock
    createOrUpdateUser?: jest.Mock
  }

  beforeEach(() => {
    userDAOMock = {
      createOrUpdateUser: jest.fn().mockResolvedValue(undefined),
      getUserByIdentifier: jest.fn().mockResolvedValue({
        id: 1,
        personId: 1,
      } satisfies DbUser),
    }
    ;(UserDAO as unknown as jest.Mock).mockImplementation(() => userDAOMock)

    userService = new UserService()
  })

  it('should return false if no valid identifier is provided', async () => {
    const profile: AuthenticationProfile = { email: 'johndo@university.edu' }
    const result = await userService.submitProfile(profile)
    expect(result).toBe(false)

    expect(userDAOMock.getUserByIdentifier).not.toHaveBeenCalled()
  })

  it('should return true if the user is found in the database', async () => {
    const profile: AuthenticationProfile = { username: 'local-johndoe' }

    const result = await userService.submitProfile(profile)
    expect(result).toBe(true)

    expect(userDAOMock.getUserByIdentifier).toHaveBeenCalledWith({
      type: 'LOCAL',
      value: 'local-johndoe',
    })
  })
})
