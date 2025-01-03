import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('User Model Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create a new user', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test4567',
        email: 'user4@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    const user = await prisma.user.create({
      data: {
        personId: person.id,
      },
    })

    expect(user).toHaveProperty('id')
    expect(user.personId).toBe(person.id)
  })

  test('should find a user by email', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'local-test4321',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    await prisma.user.create({
      data: {
        personId: person.id,
      },
    })

    const foundUser = await prisma.user.findUnique({
      where: { personId: person.id },
    })

    expect(foundUser).not.toBeNull()
    expect(foundUser?.personId).toBe(person.id)
  })
})
