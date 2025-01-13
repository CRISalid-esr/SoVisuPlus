import {
  ResearchStructure as DbResearchStructure,
  PrismaClient,
} from '@prisma/client'
import { ResearchStructure } from '@/types/ResearchStructure'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    researchStructure: {
      upsert: jest.fn(),
    },
    researchStructureIdentifier: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  }
  return { PrismaClient: jest.fn(() => mockPrismaClient) }
})
const mockPrisma = new PrismaClient()

describe('ResearchStructureDAO', () => {
  let researchStructureDAO: ResearchStructureDAO
  beforeEach(() => {
    jest.clearAllMocks()
    researchStructureDAO = new ResearchStructureDAO()
  })

  const researchStructure: ResearchStructure = {
    uid: 'local-rs001',
    acronym: 'RS001',
    names: { en: 'Research Structure 001' },
    descriptions: { en: 'A description for Research Structure 001' },
    identifiers: [
      {
        type: 'RNSR',
        value: '001234567Z',
      },
    ],
  }

  it('should upsert a research structure', async () => {
    ;(mockPrisma.researchStructure.upsert as jest.Mock).mockResolvedValue({
      ...researchStructure,
      id: 1,
    })

    const dbResearchStructure: DbResearchStructure =
      await researchStructureDAO.createOrUpdateResearchStructure(
        researchStructure,
      )

    expect(dbResearchStructure.uid).toEqual('local-rs001')
    expect(dbResearchStructure.acronym).toEqual('RS001')
    expect(mockPrisma.researchStructure.upsert).toHaveBeenCalledWith({
      where: { uid: researchStructure.uid },
      update: {
        acronym: researchStructure.acronym,
        names: researchStructure.names,
        descriptions: researchStructure.descriptions,
      },
      create: {
        uid: researchStructure.uid,
        acronym: researchStructure.acronym,
        names: researchStructure.names,
        descriptions: researchStructure.descriptions,
      },
    })
  })

  it('should call deleteMany and createMany for upsertIdentifiers', async () => {
    ;(mockPrisma.researchStructure.upsert as jest.Mock).mockResolvedValue({
      ...researchStructure,
      id: 1,
    })
    ;(
      mockPrisma.researchStructureIdentifier.deleteMany as jest.Mock
    ).mockResolvedValue({})
    ;(
      mockPrisma.researchStructureIdentifier.createMany as jest.Mock
    ).mockResolvedValue({})

    await researchStructureDAO.createOrUpdateResearchStructure(
      researchStructure,
    )

    expect(
      mockPrisma.researchStructureIdentifier.deleteMany,
    ).toHaveBeenCalledWith({
      where: { researchStructureId: 1 },
    })

    expect(
      mockPrisma.researchStructureIdentifier.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          researchStructureId: 1,
          type: 'RNSR',
          value: '001234567Z',
        },
      ],
    })
  })

  it('should handle errors during upsert', async () => {
    ;(mockPrisma.researchStructure.upsert as jest.Mock).mockRejectedValue(
      new Error('Upsert failed'),
    )

    await expect(
      researchStructureDAO.createOrUpdateResearchStructure(researchStructure),
    ).rejects.toThrow('Failed to upsert research structure: Upsert failed')

    expect(mockPrisma.researchStructure.upsert).toHaveBeenCalled()
  })
})
