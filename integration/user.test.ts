import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('User Model Tests', () => {
  beforeAll(async () => {
    // Reset the User table
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create a new user', async () => {
    const user = await prisma.user.create({
      data: {
        person_uid: 'local-test1234',
        email: 'test@example.com',
      },
    })

    expect(user).toHaveProperty('id')
    expect(user.email).toBe('test@example.com')
  })

  test('should find a user by email', async () => {
    await prisma.user.create({
      data: {
        person_uid: 'local-test1234',
        email: 'findme@example.com',
      },
    })

    const foundUser = await prisma.user.findUnique({
      where: { email: 'findme@example.com' },
    })

    expect(foundUser).not.toBeNull()
    expect(foundUser?.email).toBe('findme@example.com')
  })
})
