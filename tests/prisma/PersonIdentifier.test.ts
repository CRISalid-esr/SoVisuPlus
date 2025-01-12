import prisma from '@/lib/daos/prisma'
import { PersonIdentifierType } from '@prisma/client'

describe('PersonIdentifier Model Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create a PersonIdentifier for a user', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test1234',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    const personIdentifier = await prisma.personIdentifier.create({
      data: {
        type: PersonIdentifierType.ORCID,
        value: '12345',
        person: {
          connect: {
            id: person.id,
          },
        },
      },
    })

    expect(personIdentifier).toHaveProperty('id')
    expect(personIdentifier.value).toBe('12345')
    expect(personIdentifier.personId).toBe(person.id)
  })

  test('should fetch an PersonIdentifier for a user', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test2345',
        email: 'user2@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    const personIdentifier = await prisma.personIdentifier.create({
      data: {
        type: 'SCOPUS_EID',
        value: '67890',
        person: {
          connect: {
            id: person.id,
          },
        },
      },
    })

    const fetchedAgent = await prisma.personIdentifier.findUnique({
      where: {
        type_value: {
          type: personIdentifier.type,
          value: personIdentifier.value,
        },
      },
    })

    expect(fetchedAgent).not.toBeNull()
    expect(fetchedAgent?.value).toBe('67890')
  })
})
