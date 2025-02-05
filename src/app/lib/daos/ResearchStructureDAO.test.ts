import {
  PrismaClient,
  ResearchStructure as DbResearchStructure,
} from '@prisma/client'
import { ResearchStructure } from '@/types/ResearchStructure'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { ResearchStructureIdentifierType } from '@/types/ResearchStructureIdentifier'
import { Literal } from '@/types/Literal'

jest.mock('@prisma/client', () => {
  // avoid PersonIdentifierType to be mocked
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')
  const mockPrismaClient = {
    researchStructure: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    researchStructureName: {
      upsert: jest.fn(),
    },
    researchStructureDescription: {
      upsert: jest.fn(),
    },
    researchStructureIdentifier: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  }
  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient), // Override PrismaClient with the mock
  }
})
const mockPrisma = new PrismaClient()

describe('ResearchStructureDAO', () => {
  let researchStructureDAO: ResearchStructureDAO
  beforeEach(() => {
    jest.clearAllMocks()
    researchStructureDAO = new ResearchStructureDAO()
  })

  const researchStructure: ResearchStructure = new ResearchStructure(
    'local-rs001',
    'RS001',
    [new Literal('Research Structure 001', 'en')],
    [new Literal('A description for Research Structure 001', 'en')],
    [{ type: ResearchStructureIdentifierType.RNSR, value: '001234567Z' }],
  )

  it('should upsert a research structure', async () => {
    ;(mockPrisma.researchStructure.findUnique as jest.Mock).mockResolvedValue(
      null,
    )
    ;(mockPrisma.researchStructure.create as jest.Mock).mockResolvedValue({
      ...researchStructure,
      id: 1,
    })

    const dbResearchStructure: DbResearchStructure =
      await researchStructureDAO.createOrUpdateResearchStructure(
        researchStructure,
      )

    expect(dbResearchStructure.uid).toEqual('local-rs001')
    expect(dbResearchStructure.acronym).toEqual('RS001')
    expect(mockPrisma.researchStructure.findUnique).toHaveBeenCalledWith({
      where: { uid: 'local-rs001' },
      include: {
        descriptions: true,
        identifiers: true,
        names: true,
      },
    })
    expect(mockPrisma.researchStructure.create).toHaveBeenCalledWith({
      data: {
        uid: researchStructure.uid,
        acronym: researchStructure.acronym,
      },

      include: {
        descriptions: true,
        identifiers: true,
        names: true,
      },
    })
  })

  it('should call deleteMany and createMany for upsertIdentifiers', async () => {
    ;(mockPrisma.researchStructure.create as jest.Mock).mockResolvedValue({
      ...researchStructure,
      id: 1,
    })
    ;(
      mockPrisma.researchStructureIdentifier.deleteMany as jest.Mock
    ).mockResolvedValue({})
    ;(
      mockPrisma.researchStructureIdentifier.create as jest.Mock
    ).mockResolvedValue({})

    await researchStructureDAO.createOrUpdateResearchStructure(
      researchStructure,
    )

    expect(
      mockPrisma.researchStructureIdentifier.deleteMany,
    ).toHaveBeenCalledWith({
      where: { researchStructureId: 1 },
    })

    expect(mockPrisma.researchStructureIdentifier.create).toHaveBeenCalledWith({
      data: {
        researchStructureId: 1,
        type: 'RNSR',
        value: '001234567Z',
      },
    })
  })

  it('should handle errors during upsert', async () => {
    ;(mockPrisma.researchStructure.create as jest.Mock).mockRejectedValue(
      new Error('Upsert failed'),
    )

    await expect(
      researchStructureDAO.createOrUpdateResearchStructure(researchStructure),
    ).rejects.toThrow(
      'Failed to create or update research structure: Upsert failed',
    )

    expect(mockPrisma.researchStructure.create).toHaveBeenCalled()
  })
})
