import prisma from '@/lib/daos/prisma'
import { AgentIdentifierType } from '@prisma/client'

describe('AgentIdentifier Model Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create an AgentIdentifier for a user', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test1234',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    const agentIdentifier = await prisma.agentIdentifier.create({
      data: {
        type: AgentIdentifierType.ORCID,
        value: '12345',
        person: {
          connect: {
            id: person.id,
          },
        },
      },
    })

    expect(agentIdentifier).toHaveProperty('id')
    expect(agentIdentifier.value).toBe('12345')
    expect(agentIdentifier.personId).toBe(person.id)
  })

  test('should fetch an AgentIdentifier for a user', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test2345',
        email: 'user2@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    const agentIdentifier = await prisma.agentIdentifier.create({
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

    const fetchedAgent = await prisma.agentIdentifier.findUnique({
      where: {
        type_value: {
          type: agentIdentifier.type,
          value: agentIdentifier.value,
        },
      },
    })

    expect(fetchedAgent).not.toBeNull()
    expect(fetchedAgent?.value).toBe('67890')
  })
})
