import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('AgentIdentifier Model Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "AgentIdentifier", "User" RESTART IDENTITY CASCADE;
  `)
  })

  test('should create an AgentIdentifier for a user', async () => {
    const user = await prisma.user.create({
      data: {
        person_uid: 'local-test1234',
        email: 'user1@example.com',
      },
    })

    const agentIdentifier = await prisma.agentIdentifier.create({
      data: {
        type: 'ORCID',
        value: '12345',
        userId: user.id, // Linking to the User
      },
    })

    expect(agentIdentifier).toHaveProperty('id')
    expect(agentIdentifier.value).toBe('12345')
    expect(agentIdentifier.userId).toBe(user.id)
  })

  test('should fetch an AgentIdentifier for a user', async () => {
    const user = await prisma.user.create({
      data: {
        person_uid: 'local-test1234',
        email: 'user2@example.com',
      },
    })

    const agentIdentifier = await prisma.agentIdentifier.create({
      data: {
        type: 'SCOPUS_EID',
        value: '67890',
        userId: user.id,
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
