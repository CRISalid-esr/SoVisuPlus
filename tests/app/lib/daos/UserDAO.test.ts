import { UserDAO } from '@/lib/daos/UserDAO'
import prisma from '@/lib/daos/prisma'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

describe('UserDAO Integration Tests', () => {
  let userDAO: UserDAO

  beforeAll(() => {
    userDAO = new UserDAO()
  })

  test('should create or update a user', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test789',
        email: 'testuser@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
      },
    })

    const dbUser = await userDAO.createOrUpdateUser(person.id)

    expect(dbUser).toHaveProperty('id')
    expect(dbUser.personId).toBe(person.id)

    const fetchedUser = await prisma.user.findUnique({
      where: { personId: person.id },
    })

    expect(fetchedUser).not.toBeNull()
    expect(fetchedUser?.personId).toBe(person.id)
  })

  test('should fetch a user by identifier', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test123',
        email: 'testuser2@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
      },
    })

    await prisma.personIdentifier.create({
      data: {
        type: PersonIdentifierType.orcid,
        value: '0000-0001-2345-6789',
        personId: person.id,
      },
    })

    await prisma.user.create({
      data: { personId: person.id },
    })

    const dbUser = await userDAO.getUserByIdentifier(
      new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-2345-6789'),
    )

    expect(dbUser).not.toBeNull()
    expect(dbUser?.person?.uid).toBe(person.uid)
  })

  test('should return null if no user matches the identifier', async () => {
    const dbUser = await userDAO.getUserByIdentifier(
      new PersonIdentifier(PersonIdentifierType.orcid, 'non-existent-value'),
    )

    expect(dbUser).toBeNull()
  })

  test('should throw an error if createOrUpdateUser fails', async () => {
    await expect(userDAO.createOrUpdateUser(999)).rejects.toThrow(
      'Failed to upsert user',
    )
  })
})
