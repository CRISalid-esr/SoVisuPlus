import prisma from '@/lib/daos/prisma'

describe('ResearchUnit Model Tests', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await prisma.researchUnit.deleteMany()
    await prisma.researchUnitName.deleteMany()
    await prisma.researchUnitDescription.deleteMany()
  })

  afterAll(async () => {
    // Disconnect Prisma after all tests
    await prisma.$disconnect()
  })

  test('should create a new research unit with names and descriptions', async () => {
    const researchUnit = await prisma.researchUnit.create({
      data: {
        uid: 'rs-123',
        acronym: 'ABC',
        signature: 'ABC_signature',
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

    expect(researchUnit).toHaveProperty('id')
    expect(researchUnit.uid).toBe('rs-123')
    expect(researchUnit.acronym).toBe('ABC')
    expect(researchUnit.signature).toBe('ABC_signature')
    expect(researchUnit.names).toEqual(
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
    expect(researchUnit.descriptions).toEqual(
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

  test('should find a research unit by UID with names and descriptions', async () => {
    await prisma.researchUnit.create({
      data: {
        uid: 'rs-456',
        acronym: 'XYZ',
        signature: 'XYZ_signature',
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

    const foundUnit = await prisma.researchUnit.findUnique({
      where: { uid: 'rs-456' },
      include: { names: true, descriptions: true },
    })

    expect(foundUnit).not.toBeNull()
    expect(foundUnit?.uid).toBe('rs-456')
    expect(foundUnit?.acronym).toBe('XYZ')
    expect(foundUnit?.signature).toBe('XYZ_signature')
    expect(foundUnit?.names).toEqual(
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
    expect(foundUnit?.descriptions).toEqual(
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
