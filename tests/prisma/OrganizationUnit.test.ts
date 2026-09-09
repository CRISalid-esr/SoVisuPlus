import prisma from '@/lib/daos/prisma'

describe('OrganizationUnit Model Tests', () => {
  beforeEach(async () => {
    // Clear the database before each test (labels/descriptions cascade)
    await prisma.organizationUnit.deleteMany()
  })

  afterAll(async () => {
    // Disconnect Prisma after all tests
    await prisma.$disconnect()
  })

  test('should create a new organization unit with labels and descriptions', async () => {
    const organizationUnit = await prisma.organizationUnit.create({
      data: {
        uid: 'rs-123',
        acronym: 'ABC',
        genericType: 'unit',
        category: 'research_unit',
        labels: {
          create: [
            {
              kind: 'long',
              value: 'International Research Center',
              language: 'en',
            },
            {
              kind: 'long',
              value: 'Centre de recherche international',
              language: 'fr',
            },
          ],
        },
        descriptions: {
          create: [
            { value: 'A leading research center.', language: 'en' },
            { value: 'Un centre de recherche de pointe.', language: 'fr' },
          ],
        },
      },
      include: { labels: true, descriptions: true },
    })

    expect(organizationUnit).toHaveProperty('id')
    expect(organizationUnit.uid).toBe('rs-123')
    expect(organizationUnit.acronym).toBe('ABC')
    expect(organizationUnit.genericType).toBe('unit')
    expect(organizationUnit.category).toBe('research_unit')
    expect(organizationUnit.external).toBe(false)
    expect(organizationUnit.labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'long',
          value: 'International Research Center',
          language: 'en',
        }),
        expect.objectContaining({
          kind: 'long',
          value: 'Centre de recherche international',
          language: 'fr',
        }),
      ]),
    )
    expect(organizationUnit.descriptions).toEqual(
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

  test('should find an organization unit by UID with labels and descriptions', async () => {
    await prisma.organizationUnit.create({
      data: {
        uid: 'rs-456',
        acronym: 'XYZ',
        genericType: 'unit',
        category: 'research_unit',
        labels: {
          create: [
            { kind: 'long', value: 'Space Research Lab', language: 'en' },
            {
              kind: 'long',
              value: 'Laboratoire de recherche spatiale',
              language: 'fr',
            },
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

    const foundUnit = await prisma.organizationUnit.findUnique({
      where: { uid: 'rs-456' },
      include: { labels: true, descriptions: true },
    })

    expect(foundUnit).not.toBeNull()
    expect(foundUnit?.uid).toBe('rs-456')
    expect(foundUnit?.acronym).toBe('XYZ')
    expect(foundUnit?.genericType).toBe('unit')
    expect(foundUnit?.category).toBe('research_unit')
    expect(foundUnit?.labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'long',
          value: 'Space Research Lab',
          language: 'en',
        }),
        expect.objectContaining({
          kind: 'long',
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

  test('should reject two labels with the same kind and language on the same unit', async () => {
    const unit = await prisma.organizationUnit.create({
      data: {
        uid: 'rs-789',
        genericType: 'unit',
        category: 'research_unit',
        labels: {
          create: [{ kind: 'long', value: 'First name', language: 'en' }],
        },
      },
    })

    await expect(
      prisma.organizationUnitLabel.create({
        data: {
          organizationUnitId: unit.id,
          kind: 'long',
          value: 'Second name',
          language: 'en',
        },
      }),
    ).rejects.toThrow()

    // A different kind for the same language is allowed
    await expect(
      prisma.organizationUnitLabel.create({
        data: {
          organizationUnitId: unit.id,
          kind: 'short',
          value: 'Short name',
          language: 'en',
        },
      }),
    ).resolves.toMatchObject({ kind: 'short', language: 'en' })
  })
})
