import {
  PrismaClient,
  ResearchUnit as DbResearchUnit,
  ResearchUnitIdentifierType as DbResearchUnitIdentifierType,
} from '@prisma/client'
import { ResearchUnit } from '@/types/ResearchUnit'
import { ResearchUnitDAO } from '@/lib/daos/ResearchUnitDAO'
import { Literal } from '@/types/Literal'

jest.mock('@prisma/client', () => {
  // avoid PersonIdentifierType to be mocked
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')
  const mockPrismaClient = {
    researchUnit: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    researchUnitName: {
      upsert: jest.fn(),
    },
    researchUnitDescription: {
      upsert: jest.fn(),
    },
    researchUnitIdentifier: {
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

describe('ResearchUnitDAO', () => {
  let researchUnitDAO: ResearchUnitDAO
  beforeEach(() => {
    jest.clearAllMocks()
    researchUnitDAO = new ResearchUnitDAO()
  })

  const researchUnit: ResearchUnit = new ResearchUnit(
    'local-rs001',
    'RS001',
    [new Literal('Research Unit 001', 'en')],
    [new Literal('A description for Research Unit 001', 'en')],
    'RS001_signature',
    [
      { type: DbResearchUnitIdentifierType.nns, value: '001234567Z' },
      {
        type: DbResearchUnitIdentifierType.ror,
        value: 'https://ror.org/01',
      },
    ],
  )

  it('should upsert a research unit', async () => {
    ;(mockPrisma.researchUnit.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.researchUnit.create as jest.Mock).mockResolvedValue({
      ...researchUnit,
      id: 1,
    })
    ;(mockPrisma.researchUnit.upsert as jest.Mock).mockResolvedValue({
      ...researchUnit,
      id: 1,
    })
    ;(mockPrisma.researchUnit.findFirst as jest.Mock).mockResolvedValue(null)

    const dbResearchUnit: DbResearchUnit =
      await researchUnitDAO.createOrUpdateResearchUnit(researchUnit)

    expect(dbResearchUnit.uid).toEqual('local-rs001')
    expect(dbResearchUnit.acronym).toEqual('RS001')
    expect(dbResearchUnit.signature).toEqual('RS001_signature')

    expect(mockPrisma.researchUnit.findFirst).toHaveBeenCalledWith({
      where: { NOT: { uid: 'local-rs001' }, slug: 'research-unit:rs001' },
    })

    expect(mockPrisma.researchUnit.upsert).toHaveBeenCalledWith({
      where: { uid: researchUnit.uid },
      update: {
        acronym: researchUnit.acronym,
        signature: researchUnit.signature,
        slug: 'research-unit:rs001',
      },
      create: {
        uid: researchUnit.uid,
        acronym: researchUnit.acronym,
        signature: researchUnit.signature,
        slug: 'research-unit:rs001',
      },
      include: { names: true, descriptions: true, identifiers: true },
    })
  })

  it('should call deleteMany and createMany for upsertIdentifiers', async () => {
    ;(mockPrisma.researchUnit.create as jest.Mock).mockResolvedValue({
      ...researchUnit,
      id: 1,
    })
    ;(
      mockPrisma.researchUnitIdentifier.deleteMany as jest.Mock
    ).mockResolvedValue({})
    ;(mockPrisma.researchUnitIdentifier.create as jest.Mock).mockResolvedValue(
      {},
    )

    await researchUnitDAO.createOrUpdateResearchUnit(researchUnit)

    expect(mockPrisma.researchUnitIdentifier.deleteMany).toHaveBeenCalledWith({
      where: { researchUnitId: 1 },
    })
    expect(mockPrisma.researchUnitIdentifier.create).toHaveBeenCalledWith({
      data: {
        researchUnitId: 1,
        type: DbResearchUnitIdentifierType.nns,
        value: '001234567Z',
      },
    })

    expect(mockPrisma.researchUnitIdentifier.create).toHaveBeenCalledWith({
      data: {
        researchUnitId: 1,
        type: DbResearchUnitIdentifierType.ror,
        value: 'https://ror.org/01',
      },
    })
  })

  it('should handle errors during upsert', async () => {
    ;(mockPrisma.researchUnit.upsert as jest.Mock).mockRejectedValue(
      new Error('Upsert failed'),
    )

    await expect(
      researchUnitDAO.createOrUpdateResearchUnit(researchUnit),
    ).rejects.toThrow('Failed to upsert research unit: Upsert failed')

    expect(mockPrisma.researchUnit.upsert).toHaveBeenCalled()
  })
})
