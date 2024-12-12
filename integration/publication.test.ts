import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Publication Model Tests', () => {
  beforeAll(async () => {
    // Reset the Publication table
    await prisma.$executeRaw`TRUNCATE TABLE "Publication" CASCADE`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create a new publication', async () => {
    //tslint:@typescript-eslint/no-unused-vars
    const publication = await prisma.publication.create({
      data: {
        uid: 'pub-123',
        titles: ['Title 1', 'Title 2'],
      },
    })

    expect(publication).toHaveProperty('id')
    expect(publication.uid).toBe('pub-123')
    expect(publication.titles).toEqual(
      expect.arrayContaining(['Title 1', 'Title 2']),
    )
  })

  test('should find a publication by UID', async () => {
    await prisma.publication.create({
      data: {
        uid: 'pub-456',
        titles: ['Title A', 'Title B'],
      },
    })

    const foundPublication = await prisma.publication.findUnique({
      where: { uid: 'pub-456' },
    })

    expect(foundPublication).not.toBeNull()
    expect(foundPublication?.uid).toBe('pub-456')
    expect(foundPublication?.titles).toEqual(
      expect.arrayContaining(['Title A', 'Title B']),
    )
  })
})
