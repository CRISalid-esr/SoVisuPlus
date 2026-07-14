import {
  PrismaClient,
  OrganizationUnit as DbOrganizationUnit,
  OrganizationIdentifierType as DbOrganizationIdentifierType,
  OrganizationCategory,
  OrganizationGenericType,
} from '@prisma/client'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { Literal } from '@/types/Literal'

jest.mock('@prisma/client', () => {
  // avoid enums to be mocked
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')
  const mockPrismaClient = {
    organizationUnit: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    organizationUnitLabel: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    organizationUnitDescription: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    organizationUnitIdentifier: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    organizationRelationship: {
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

describe('OrganizationUnitDAO', () => {
  let organizationUnitDAO: OrganizationUnitDAO
  beforeEach(() => {
    jest.clearAllMocks()
    organizationUnitDAO = new OrganizationUnitDAO()
  })

  const organizationUnit: OrganizationUnit = new OrganizationUnit(
    'local-rs001',
    'RS001',
    [new Literal('Research Unit 001', 'en')],
    [new Literal('A description for Research Unit 001', 'en')],
    OrganizationCategory.research_unit,
    OrganizationGenericType.unit,
    'UMR',
    [
      { type: DbOrganizationIdentifierType.nns, value: '001234567Z' },
      {
        type: DbOrganizationIdentifierType.ror,
        value: 'https://ror.org/01',
      },
    ],
  )

  it('should upsert an organization unit', async () => {
    ;(mockPrisma.organizationUnit.findFirst as jest.Mock).mockResolvedValue(
      null,
    )
    ;(mockPrisma.organizationUnit.upsert as jest.Mock).mockResolvedValue({
      ...organizationUnit,
      id: 1,
    })

    const dbOrganizationUnit: DbOrganizationUnit =
      await organizationUnitDAO.createOrUpdateOrganizationUnit(organizationUnit)

    expect(dbOrganizationUnit.uid).toEqual('local-rs001')
    expect(dbOrganizationUnit.acronym).toEqual('RS001')

    expect(mockPrisma.organizationUnit.findFirst).toHaveBeenCalledWith({
      where: { NOT: { uid: 'local-rs001' }, slug: 'org:rs001' },
    })

    const scalarFields = {
      genericType: OrganizationGenericType.unit,
      category: OrganizationCategory.research_unit,
      nationalType: 'UMR',
      external: false,
      acronym: 'RS001',
      localTypes: [],
      slug: 'org:rs001',
    }
    expect(mockPrisma.organizationUnit.upsert).toHaveBeenCalledWith({
      where: { uid: organizationUnit.uid },
      update: scalarFields,
      create: {
        uid: organizationUnit.uid,
        ...scalarFields,
      },
    })
  })

  it('should replace labels and descriptions with the incoming ones', async () => {
    ;(mockPrisma.organizationUnit.findFirst as jest.Mock).mockResolvedValue(
      null,
    )
    ;(mockPrisma.organizationUnit.upsert as jest.Mock).mockResolvedValue({
      ...organizationUnit,
      id: 1,
    })

    await organizationUnitDAO.createOrUpdateOrganizationUnit(organizationUnit)

    expect(mockPrisma.organizationUnitLabel.deleteMany).toHaveBeenCalledWith({
      where: {
        organizationUnitId: 1,
        kind: 'long',
        NOT: { language: { in: ['en'] } },
      },
    })
    expect(mockPrisma.organizationUnitLabel.upsert).toHaveBeenCalledWith({
      where: {
        organizationUnitId_kind_language: {
          organizationUnitId: 1,
          kind: 'long',
          language: 'en',
        },
      },
      update: { value: 'Research Unit 001' },
      create: {
        organizationUnitId: 1,
        kind: 'long',
        language: 'en',
        value: 'Research Unit 001',
      },
    })

    expect(
      mockPrisma.organizationUnitDescription.deleteMany,
    ).toHaveBeenCalledWith({
      where: {
        organizationUnitId: 1,
        NOT: { language: { in: ['en'] } },
      },
    })
    expect(mockPrisma.organizationUnitDescription.upsert).toHaveBeenCalledWith({
      where: {
        organizationUnitId_language: {
          organizationUnitId: 1,
          language: 'en',
        },
      },
      update: { value: 'A description for Research Unit 001' },
      create: {
        organizationUnitId: 1,
        language: 'en',
        value: 'A description for Research Unit 001',
      },
    })
  })

  it('should call deleteMany and create for upsertIdentifiers', async () => {
    ;(mockPrisma.organizationUnit.findFirst as jest.Mock).mockResolvedValue(
      null,
    )
    ;(mockPrisma.organizationUnit.upsert as jest.Mock).mockResolvedValue({
      ...organizationUnit,
      id: 1,
    })
    ;(
      mockPrisma.organizationUnitIdentifier.deleteMany as jest.Mock
    ).mockResolvedValue({})
    ;(
      mockPrisma.organizationUnitIdentifier.create as jest.Mock
    ).mockResolvedValue({})

    await organizationUnitDAO.createOrUpdateOrganizationUnit(organizationUnit)

    expect(
      mockPrisma.organizationUnitIdentifier.deleteMany,
    ).toHaveBeenCalledWith({
      where: { organizationUnitId: 1 },
    })
    expect(mockPrisma.organizationUnitIdentifier.create).toHaveBeenCalledWith({
      data: {
        organizationUnitId: 1,
        type: DbOrganizationIdentifierType.nns,
        value: '001234567Z',
      },
    })

    expect(mockPrisma.organizationUnitIdentifier.create).toHaveBeenCalledWith({
      data: {
        organizationUnitId: 1,
        type: DbOrganizationIdentifierType.ror,
        value: 'https://ror.org/01',
      },
    })
  })

  it('should handle errors during upsert', async () => {
    ;(mockPrisma.organizationUnit.findFirst as jest.Mock).mockResolvedValue(
      null,
    )
    ;(mockPrisma.organizationUnit.upsert as jest.Mock).mockRejectedValue(
      new Error('Upsert failed'),
    )

    await expect(
      organizationUnitDAO.createOrUpdateOrganizationUnit(organizationUnit),
    ).rejects.toThrow('Failed to upsert organization unit: Upsert failed')

    expect(mockPrisma.organizationUnit.upsert).toHaveBeenCalled()
  })
})
