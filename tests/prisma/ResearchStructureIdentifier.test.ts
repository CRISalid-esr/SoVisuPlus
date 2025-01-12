// file: tests/prisma/ResearchIdentifier.test.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('ResearchIdentifier Model Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  afterEach(async () => {
    await prisma.researchStructureIdentifier.deleteMany()
    await prisma.researchStructure.deleteMany()
  })

  test('should create a ResearchIdentifier for a research structure', async () => {
    const researchStructure = await prisma.researchStructure.create({
      data: {
        uid: 'rs-789',
        acronym: 'DEF',
        names: {
          en: 'Data Science Institute',
          fr: 'Institut des sciences des données',
        },
        descriptions: {
          en: 'Focuses on data-driven research.',
          fr: 'Axé sur la recherche basée sur les données.',
        },
      },
    })

    const researchStructureIdentifier =
      await prisma.researchStructureIdentifier.create({
        data: {
          type: 'RNSR',
          value: '98765',
          researchStructure: {
            connect: {
              id: researchStructure.id,
            },
          },
        },
      })

    expect(researchStructureIdentifier).toHaveProperty('id')
    expect(researchStructureIdentifier.value).toBe('98765')
    expect(researchStructureIdentifier.researchStructureId).toBe(
      researchStructure.id,
    )
  })

  test('should fetch a ResearchIdentifier for a research structure', async () => {
    const researchStructure = await prisma.researchStructure.create({
      data: {
        uid: 'rs-101',
        acronym: 'GHI',
        names: { en: 'AI Research Hub', fr: 'Pôle de recherche en IA' },
        descriptions: {
          en: 'Hub for artificial intelligence research.',
          fr: 'Pôle axé sur la recherche en intelligence artificielle.',
        },
      },
    })

    const researchStructureIdentifier =
      await prisma.researchStructureIdentifier.create({
        data: {
          type: 'LOCAL',
          value: '54321',
          researchStructure: {
            connect: {
              id: researchStructure.id,
            },
          },
        },
      })

    const fetchedIdentifier =
      await prisma.researchStructureIdentifier.findUnique({
        where: {
          type_value: {
            type: researchStructureIdentifier.type,
            value: researchStructureIdentifier.value,
          },
        },
      })

    expect(fetchedIdentifier).not.toBeNull()
    expect(fetchedIdentifier?.value).toBe('54321')
  })
})
