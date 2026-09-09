import { ProvisionConflictError, UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import prisma from '@/lib/daos/prisma'
import { Person } from '@/types/Person'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

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
        type: 'local',
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

describe('UserService.provisionUser Integration Tests', () => {
  let userService: UserService

  beforeAll(() => {
    userService = new UserService()
  })

  afterEach(async () => {
    await prisma.userRoleScope.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.role.deleteMany()
    await prisma.personIdentifier.deleteMany()
    await prisma.user.deleteMany()
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('creates person with local identifier and user account', async () => {
    const result = await userService.provisionUser({
      username: 'jdupont',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
    })

    expect(result.personUid).toBe('local-jdupont')

    const person = await prisma.person.findUnique({
      where: { uid: 'local-jdupont' },
      include: { identifiers: true, user: true },
    })
    expect(person).not.toBeNull()
    expect(person!.firstName).toBe('Jean')
    expect(person!.lastName).toBe('Dupont')
    expect(person!.displayName).toBe('Jean Dupont')
    expect(person!.email).toBe('jean.dupont@example.com')
    expect(person!.external).toBe(false)
    expect(person!.identifiers).toEqual([
      expect.objectContaining({ type: 'local', value: 'jdupont' }),
    ])
    expect(person!.user).not.toBeNull()

    // The provisioned user is resolvable the same way auth_options does it
    const authenticated = await userService.submitProfile({
      username: 'jdupont',
    })
    expect(authenticated).toBe(true)
  })

  test('refuses to provision an already provisioned username', async () => {
    await userService.provisionUser({
      username: 'jdupont',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
    })

    await expect(
      userService.provisionUser({
        username: 'jdupont',
        firstName: 'Jeanne',
        lastName: 'Durand',
      }),
    ).rejects.toThrow(ProvisionConflictError)

    // The existing person is left untouched
    const person = await prisma.person.findUnique({
      where: { uid: 'local-jdupont' },
    })
    expect(person!.firstName).toBe('Jean')
    expect(person!.lastName).toBe('Dupont')
    expect(person!.email).toBe('jean.dupont@example.com')
    expect(await prisma.person.count()).toBe(1)
    expect(await prisma.user.count()).toBe(1)
  })

  test('refuses to overwrite a person that arrived through AMQP', async () => {
    // Simulate a graph-synced person carrying the same local identifier
    const personDAO = new PersonDAO()
    const synced = await personDAO.createOrUpdatePerson(
      new Person(
        'local-jdupont',
        false,
        'jean.dupont@my-univ.fr',
        'Jean Dupont',
        'Jean',
        'Dupont',
        [new PersonIdentifier(PersonIdentifierType.local, 'jdupont')],
      ),
    )

    await expect(
      userService.provisionUser({
        username: 'jdupont',
        firstName: 'Jeanne',
        lastName: 'Durand',
      }),
    ).rejects.toThrow(ProvisionConflictError)

    const person = await prisma.person.findUnique({
      where: { uid: 'local-jdupont' },
    })
    expect(person!.id).toBe(synced.id)
    expect(person!.email).toBe('jean.dupont@my-univ.fr')
  })

  test('a later AMQP person with the same uid merges into the provisioned row', async () => {
    const provisioned = await userService.provisionUser({
      username: 'jdupont',
      firstName: 'Jean',
      lastName: 'Dupont',
    })

    // Simulate what PersonWorker does when the graph sends the person
    const personDAO = new PersonDAO()
    const incoming = new Person(
      'local-jdupont',
      false,
      'jean.dupont@my-univ.fr',
      'Jean Dupont',
      'Jean',
      'Dupont',
      [
        new PersonIdentifier(PersonIdentifierType.local, 'jdupont'),
        new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-2345-6789'),
      ],
    )
    const merged = await personDAO.createOrUpdatePerson(incoming)

    expect(merged.id).toBe(provisioned.personId)
    expect(merged.email).toBe('jean.dupont@my-univ.fr')
    expect(await prisma.person.count()).toBe(1)

    const identifiers = await prisma.personIdentifier.findMany({
      where: { personId: merged.id },
    })
    expect(identifiers).toHaveLength(2)

    // The user account created at provisioning time is preserved
    const user = await prisma.user.findUnique({
      where: { personId: merged.id },
    })
    expect(user).not.toBeNull()
    expect(user!.id).toBe(provisioned.userId)
  })

  test('assigns self-scoped and global roles', async () => {
    await prisma.role.createMany({
      data: [{ name: 'document_editor' }, { name: 'admin' }],
    })

    const result = await userService.provisionUser({
      username: 'jdupont',
      firstName: 'Jean',
      lastName: 'Dupont',
      selfScopedRoles: ['document_editor'],
      globalRoles: ['admin'],
    })

    const userRoles = await prisma.userRole.findMany({
      where: { userId: result.userId },
      include: { role: true, scopes: true },
    })
    expect(userRoles).toHaveLength(2)

    const editor = userRoles.find((ur) => ur.role.name === 'document_editor')
    expect(editor!.scopes).toEqual([
      expect.objectContaining({
        entityType: 'Person',
        entityUid: 'local-jdupont',
      }),
    ])

    const admin = userRoles.find((ur) => ur.role.name === 'admin')
    expect(admin!.scopes).toHaveLength(0)
  })
})
