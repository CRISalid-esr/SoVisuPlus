import {
  AuthorityOrganizationIdentifierType,
  PrismaClient,
} from '@prisma/client'
import { AuthorityOrganizationDAO } from '@/lib/daos/AuthorityOrganizationDAO'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationWithRelations as DbAuthorityOrganization } from '@/prisma-schema/extended-client'

jest.mock('@prisma/client', () => {
  const prismaClient: PrismaClient = jest.requireActual('@prisma/client')
  const mockPrismaClient = {
    authorityOrganization: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    authorityOrganizationIdentifier: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  }
  return {
    ...prismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

const mockPrisma = new PrismaClient()

describe('AuthorityOrganizationDAO', () => {
  let authorityOrganizationDAO: AuthorityOrganizationDAO

  beforeEach(() => {
    jest.clearAllMocks()
    authorityOrganizationDAO = new AuthorityOrganizationDAO()
  })

  const organization = new AuthorityOrganization(
    '123',
    ['Some Organization'],
    [{ latitude: 53, longitude: 34 }],
    [
      {
        type: AuthorityOrganizationIdentifierType.hal,
        value: '123',
      },
    ],
  )

  it("should create an authority organization if it doesn't exist in database", async () => {
    ;(
      mockPrisma.authorityOrganization.findUnique as jest.Mock
    ).mockResolvedValue(null)
    ;(mockPrisma.authorityOrganization.create as jest.Mock).mockResolvedValue({
      id: 1,
    })

    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
      organization,
    )
    expect(mockPrisma.authorityOrganization.create).toHaveBeenCalledWith({
      data: {
        uid: '123',
        displayNames: ['Some Organization'],
        places: [{ latitude: 53, longitude: 34 }],
      },
      include: {
        identifiers: true,
      },
    })
  })

  it('should update an authority organization if it exists in database', async () => {
    const mockDbAuthorityOrganization: DbAuthorityOrganization = {
      id: 1,
      uid: '123',
      displayNames: ['Some Organization'],
      places: [{ latitude: 53, longitude: 34 }],
      identifiers: [
        {
          id: 1,
          type: AuthorityOrganizationIdentifierType.hal,
          value: '123',
          organizationId: 1,
        },
      ],
    }
    ;(
      mockPrisma.authorityOrganization.findUnique as jest.Mock
    ).mockResolvedValue(mockDbAuthorityOrganization)
    ;(mockPrisma.authorityOrganization.update as jest.Mock).mockResolvedValue(
      mockDbAuthorityOrganization,
    )

    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
      organization,
    )
    expect(mockPrisma.authorityOrganization.update).toHaveBeenCalledWith({
      where: { uid: '123' },
      data: {
        uid: '123',
        displayNames: ['Some Organization'],
        places: [{ latitude: 53, longitude: 34 }],
      },
      include: {
        identifiers: true,
      },
    })
  })

  it('should delete all existing authority organization identifiers in relation to the upserted authority organization and create and connect new ones', async () => {
    const mockDbAuthorityOrganization: DbAuthorityOrganization = {
      id: 1,
      uid: '123',
      displayNames: ['Some Organization'],
      places: [{ latitude: 53, longitude: 34 }],
      identifiers: [
        {
          id: 1,
          type: AuthorityOrganizationIdentifierType.idref,
          value: '456',
          organizationId: 1,
        },
      ],
    }

    const mockDbUpdatedAuthorityOrganization: DbAuthorityOrganization = {
      ...mockDbAuthorityOrganization,
      identifiers: [
        {
          id: 2,
          type: AuthorityOrganizationIdentifierType.hal,
          value: '123',
          organizationId: 1,
        },
      ],
    }
    ;(
      mockPrisma.authorityOrganization.findUnique as jest.Mock
    ).mockResolvedValue(mockDbAuthorityOrganization)
    ;(mockPrisma.authorityOrganization.update as jest.Mock)
      .mockResolvedValueOnce(mockDbAuthorityOrganization)
      .mockResolvedValueOnce(mockDbUpdatedAuthorityOrganization)
      .mockResolvedValue(null)
    ;(
      mockPrisma.authorityOrganizationIdentifier.create as jest.Mock
    ).mockResolvedValue({ id: 2 })

    const result =
      await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
        organization,
      )

    expect(
      mockPrisma.authorityOrganizationIdentifier.deleteMany,
    ).toHaveBeenCalledWith({
      where: { organizationId: 1 },
    })

    expect(
      mockPrisma.authorityOrganizationIdentifier.create,
    ).toHaveBeenCalledTimes(1)
    expect(
      mockPrisma.authorityOrganizationIdentifier.create,
    ).toHaveBeenCalledWith({
      data: {
        type: AuthorityOrganizationIdentifierType.hal,
        value: '123',
        organizationId: 1,
      },
    })
    expect(mockPrisma.authorityOrganization.update).toHaveBeenNthCalledWith(2, {
      where: { uid: '123' },
      data: {
        identifiers: {
          connect: [
            {
              id: 2,
            },
          ],
        },
      },
      include: {
        identifiers: true,
      },
    })
    expect(result).toEqual(mockDbUpdatedAuthorityOrganization)
  })
})
