import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import prisma from '@/lib/daos/prisma'
import { Person } from '@/types/Person'

describe('UserService Integration Tests', () => {
  let userService: UserService

  beforeAll(async () => {
    userService = new UserService()
  })

  afterEach(async () => {
    await prisma.personIdentifier.deleteMany()
    await prisma.user.deleteMany()
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should return true for an existing user in the database', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'existinguser@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    await prisma.personIdentifier.create({
      data: {
        type: 'LOCAL',
        value: 'existing-test123',
        person: {
          connect: { id: person.id },
        },
      },
    })

    await prisma.user.create({
      data: {
        personId: person.id,
      },
    })

    const profile: AuthenticationProfile = { username: 'existing-test123' }
    const result = await userService.submitProfile(profile)

    expect(result).toBe(true)

    const fetchedPerson = await prisma.person.findUnique({
      where: { uid: 'existing-test123' },
    })

    expect(fetchedPerson).not.toBeNull()
    expect(fetchedPerson?.email).toBe('existinguser@example.com')
  })

  test('should return false for an unknown profile', async () => {
    const profile: AuthenticationProfile = { username: 'unknown-user' }
    const result = await userService.submitProfile(profile)

    expect(result).toBe(false)
  })
})
