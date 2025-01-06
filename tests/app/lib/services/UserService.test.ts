import { PrismaClient } from '@prisma/client'
import { UserService } from '@/lib/services/UserService'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonDAO } from '@/lib/daos/PersonDAO'

const prisma = new PrismaClient()

describe('UserService Integration Tests', () => {
  let userService: UserService
  let personGraphQLClientMock: jest.Mocked<PersonGraphQLClient>

  beforeAll(async () => {
    // Initialize the UserService with mocks and real database DAO
    personGraphQLClientMock = {
      isEnabled: jest.fn().mockReturnValue(true),
      getPersonByIdentifier: jest.fn(),
    } as unknown as jest.Mocked<PersonGraphQLClient>

    const userDAO = new UserDAO()
    const personDAO = new PersonDAO()
    userService = new UserService(personGraphQLClientMock, userDAO, personDAO)
  })

  afterEach(async () => {
    await prisma.agentIdentifier.deleteMany()
    await prisma.user.deleteMany()
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create or update a user with username using GraphQL data', async () => {
    const personData = {
      uid: 'local-test123',
      external: false,
      email: 'rgarcia@example.com',
      firstName: 'Robert',
      lastName: 'Garcia',
      displayName: 'Robert Garcia',
      identifiers: [{ type: 'ORCID', value: '0000-0002-1234-5678' }],
    }

    personGraphQLClientMock.getPersonByIdentifier.mockResolvedValue(personData)

    const profile: AuthenticationProfile = { username: 'graphql-test123' }
    const result = await userService.submitProfile(profile)

    expect(result).toBe(true)

    const createdPerson = await prisma.person.findUnique({
      where: { uid: personData.uid },
    })

    expect(createdPerson).not.toBeNull()
    expect(createdPerson?.email).toBe(personData.email)

    const createdAgentIdentifier = await prisma.agentIdentifier.findFirst({
      where: { value: '0000-0002-1234-5678' },
    })

    expect(createdAgentIdentifier).not.toBeNull()
    expect(createdAgentIdentifier?.personId).toBe(createdPerson?.id)
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

    await prisma.agentIdentifier.create({
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

    personGraphQLClientMock.isEnabled.mockReturnValue(false)

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
    personGraphQLClientMock.isEnabled.mockReturnValue(false)

    const profile: AuthenticationProfile = { username: 'unknown-user' }
    const result = await userService.submitProfile(profile)

    expect(result).toBe(false)
  })
})
