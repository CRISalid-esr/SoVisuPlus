import prisma from '@/lib/daos/prisma'

describe('OrganizationUnitIdentifier Model Tests', () => {
  beforeEach(async () => {
    // Clear the database before each test (identifiers cascade)
    await prisma.organizationUnit.deleteMany()
  })

  afterAll(async () => {
    // Disconnect Prisma after all tests
    await prisma.$disconnect()
  })

  test('should create an organization unit with identifiers', async () => {
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
          ],
        },
        identifiers: {
          create: [
            { type: 'ror', value: '02en5vm52' },
            { type: 'idref', value: '123456789' },
          ],
        },
      },
      include: { identifiers: true },
    })

    expect(organizationUnit).toHaveProperty('id')
    expect(organizationUnit.uid).toBe('rs-123')
    expect(organizationUnit.identifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'ror', value: '02en5vm52' }),
        expect.objectContaining({ type: 'idref', value: '123456789' }),
      ]),
    )
  })

  test('should find an organization unit by UID with identifiers', async () => {
    await prisma.organizationUnit.create({
      data: {
        uid: 'rs-456',
        acronym: 'XYZ',
        genericType: 'unit',
        category: 'research_unit',
        identifiers: {
          create: [{ type: 'hal', value: 'HAL-STRUCT-1' }],
        },
      },
    })

    const foundUnit = await prisma.organizationUnit.findUnique({
      where: { uid: 'rs-456' },
      include: { identifiers: true },
    })

    expect(foundUnit).not.toBeNull()
    expect(foundUnit?.uid).toBe('rs-456')
    expect(foundUnit?.identifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'hal', value: 'HAL-STRUCT-1' }),
      ]),
    )
  })

  test('should reject two identifiers with the same type and value', async () => {
    const unitA = await prisma.organizationUnit.create({
      data: {
        uid: 'rs-a',
        genericType: 'unit',
        category: 'research_unit',
        identifiers: { create: [{ type: 'ror', value: '02en5vm52' }] },
      },
    })

    const unitB = await prisma.organizationUnit.create({
      data: {
        uid: 'rs-b',
        genericType: 'unit',
        category: 'research_unit',
      },
    })

    // Same (type, value) pair anywhere in the table is rejected
    await expect(
      prisma.organizationUnitIdentifier.create({
        data: {
          organizationUnitId: unitB.id,
          type: 'ror',
          value: '02en5vm52',
        },
      }),
    ).rejects.toThrow()

    // Same type with a different value is allowed
    await expect(
      prisma.organizationUnitIdentifier.create({
        data: {
          organizationUnitId: unitA.id,
          type: 'ror',
          value: '05f82e368',
        },
      }),
    ).resolves.toMatchObject({ type: 'ror', value: '05f82e368' })
  })
})
