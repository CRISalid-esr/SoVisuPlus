import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('AgentIdentifier Model Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Person", "AgentIdentifier", "User" RESTART IDENTITY CASCADE;
  `)
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
        type: 'ORCID',
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
        uid: 'local-test1234',
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
        type: agentIdentifier.type,
        value: agentIdentifier.value,
      },
    })

    expect(fetchedAgent).not.toBeNull()
    expect(fetchedAgent?.value).toBe('67890')
  })
})
