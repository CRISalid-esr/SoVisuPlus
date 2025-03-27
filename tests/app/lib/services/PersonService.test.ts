import prisma from '@/lib/daos/prisma'
import { PersonService } from '@/lib/services/PersonService'

describe('PersonService Integration Tests', () => {
  let personService: PersonService

  beforeAll(async () => {
    personService = new PersonService()
  })

  afterEach(async () => {
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should find a person by name ', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'johndoe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        external: false,
        normalizedName: 'john doe',
      },
    })

    const result = await personService.fetchPeople('Doe', 1, false, 10)
    expect(result.people).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
    expect(result.people[0].uid).toBe(person.uid)
    expect(result.people[0].email).toBe(person.email)
    expect(result.people[0].firstName).toBe(person.firstName)
    expect(result.people[0].lastName).toBe(person.lastName)
  })
  test('should find a person by name ignoring case', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'johndoe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        normalizedName: 'john doe',
      },
    })
    const result = await personService.fetchPeople('dOe', 1, false, 10)
    expect(result.people).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
    expect(result.people[0].uid).toBe(person.uid)
  })
  test('should find a person by name ignoring accents', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'johndoe@example.com',
        firstName: 'Cécile',
        lastName: 'Doe',
        normalizedName: 'cecile doe',
      },
    })
    const result = await personService.fetchPeople('cecile', 1, false, 10)
    expect(result.people).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
    expect(result.people[0].uid).toBe(person.uid)
  })
})
