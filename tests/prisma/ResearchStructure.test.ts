import prisma from '@/lib/daos/prisma'

describe('ResearchStructure Model Tests', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await prisma.researchStructure.deleteMany()
    await prisma.researchStructureName.deleteMany()
    await prisma.researchStructureDescription.deleteMany()
  })

  afterAll(async () => {
    // Disconnect Prisma after all tests
    await prisma.$disconnect()
  })

  test('should create a new research structure with names and descriptions', async () => {
    const researchStructure = await prisma.researchStructure.create({
      data: {
        uid: 'rs-123',
        acronym: 'ABC',
        names: {
          create: [
            { value: 'International Research Center', language: 'en' },
            { value: 'Centre de recherche international', language: 'fr' },
          ],
        },
        descriptions: {
          create: [
            { value: 'A leading research center.', language: 'en' },
            { value: 'Un centre de recherche de pointe.', language: 'fr' },
          ],
        },
      },
      include: { names: true, descriptions: true },
    })

    expect(researchStructure).toHaveProperty('id')
    expect(researchStructure.uid).toBe('rs-123')
    expect(researchStructure.acronym).toBe('ABC')
    expect(researchStructure.names).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'International Research Center',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Centre de recherche international',
          language: 'fr',
        }),
      ]),
    )
    expect(researchStructure.descriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'A leading research center.',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Un centre de recherche de pointe.',
          language: 'fr',
        }),
      ]),
    )
  })

  test('should find a research structure by UID with names and descriptions', async () => {
    await prisma.researchStructure.create({
      data: {
        uid: 'rs-456',
        acronym: 'XYZ',
        names: {
          create: [
            { value: 'Space Research Lab', language: 'en' },
            { value: 'Laboratoire de recherche spatiale', language: 'fr' },
          ],
        },
        descriptions: {
          create: [
            {
              value: 'Research lab focusing on space exploration.',
              language: 'en',
            },
            {
              value: 'Laboratoire axé sur l’exploration spatiale.',
              language: 'fr',
            },
          ],
        },
      },
    })

    const foundStructure = await prisma.researchStructure.findUnique({
      where: { uid: 'rs-456' },
      include: { names: true, descriptions: true },
    })

    expect(foundStructure).not.toBeNull()
    expect(foundStructure?.uid).toBe('rs-456')
    expect(foundStructure?.acronym).toBe('XYZ')
    expect(foundStructure?.names).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Space Research Lab',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Laboratoire de recherche spatiale',
          language: 'fr',
        }),
      ]),
    )
    expect(foundStructure?.descriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Research lab focusing on space exploration.',
          language: 'en',
        }),
        expect.objectContaining({
          value: 'Laboratoire axé sur l’exploration spatiale.',
          language: 'fr',
        }),
      ]),
    )
  })
})
