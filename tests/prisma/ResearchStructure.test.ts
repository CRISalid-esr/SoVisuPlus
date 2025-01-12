import prisma from '@/lib/daos/prisma'

describe('ResearchStructure Model Tests', () => {
  test('should create a new research structure', async () => {
    const researchStructure = await prisma.researchStructure.create({
      data: {
        uid: 'rs-123',
        acronym: 'ABC',
        names: {
          en: 'International Research Center',
          fr: 'Centre de recherche international',
        },
        descriptions: {
          en: 'A leading research center.',
          fr: 'Un centre de recherche de pointe.',
        },
      },
    })

    expect(researchStructure).toHaveProperty('id')
    expect(researchStructure.uid).toBe('rs-123')
    expect(researchStructure.acronym).toBe('ABC')
    expect(researchStructure.names).toEqual({
      en: 'International Research Center',
      fr: 'Centre de recherche international',
    })
    expect(researchStructure.descriptions).toEqual({
      en: 'A leading research center.',
      fr: 'Un centre de recherche de pointe.',
    })
  })

  test('should find a research structure by UID', async () => {
    await prisma.researchStructure.create({
      data: {
        uid: 'rs-456',
        acronym: 'XYZ',
        names: {
          en: 'Space Research Lab',
          fr: 'Laboratoire de recherche spatiale',
        },
        descriptions: {
          en: 'Research lab focusing on space exploration.',
          fr: 'Laboratoire axé sur l’exploration spatiale.',
        },
      },
    })

    const foundStructure = await prisma.researchStructure.findUnique({
      where: { uid: 'rs-456' },
    })

    expect(foundStructure).not.toBeNull()
    expect(foundStructure?.uid).toBe('rs-456')
    expect(foundStructure?.acronym).toBe('XYZ')
    expect(foundStructure?.names).toEqual({
      en: 'Space Research Lab',
      fr: 'Laboratoire de recherche spatiale',
    })
    expect(foundStructure?.descriptions).toEqual({
      en: 'Research lab focusing on space exploration.',
      fr: 'Laboratoire axé sur l’exploration spatiale.',
    })
  })
})
