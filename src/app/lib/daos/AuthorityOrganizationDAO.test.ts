import {
  AuthorityOrganizationIdentifierType,
  AuthorityOrganizationType,
  PrismaClient,
} from '@prisma/client'
import { AuthorityOrganizationDAO } from '@/lib/daos/AuthorityOrganizationDAO'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'

jest.mock('@prisma/client', () => {
  const prismaClient: PrismaClient = jest.requireActual('@prisma/client')
  const mockPrismaClient = {
    authorityOrganization: {
      upsert: jest.fn(),
    },
  }
  return {
    ...prismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

const mockPrisma = new PrismaClient()
const upsertMock = () => mockPrisma.authorityOrganization.upsert as jest.Mock

describe('AuthorityOrganizationDAO', () => {
  let authorityOrganizationDAO: AuthorityOrganizationDAO

  beforeEach(() => {
    jest.clearAllMocks()
    authorityOrganizationDAO = new AuthorityOrganizationDAO()
    upsertMock().mockResolvedValue({ id: 1 })
  })

  const organization = new AuthorityOrganization(
    '123',
    ['Some Organization'],
    AuthorityOrganizationType.laboratory,
    [{ latitude: 53, longitude: 34 }],
    [
      {
        type: AuthorityOrganizationIdentifierType.hal,
        value: '123',
      },
    ],
  )

  it('upserts the organization, connecting/creating identifiers as a shared many-to-many by (type, value)', async () => {
    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
      organization,
    )

    const link = {
      where: {
        type_value: {
          type: AuthorityOrganizationIdentifierType.hal,
          value: '123',
        },
      },
      create: { type: AuthorityOrganizationIdentifierType.hal, value: '123' },
    }
    expect(upsertMock()).toHaveBeenCalledWith({
      where: { uid: '123' },
      create: {
        uid: '123',
        displayNames: ['Some Organization'],
        type: AuthorityOrganizationType.laboratory,
        places: [{ latitude: 53, longitude: 34 }],
        identifiers: { connectOrCreate: [link] },
      },
      update: {
        displayNames: ['Some Organization'],
        type: AuthorityOrganizationType.laboratory,
        places: [{ latitude: 53, longitude: 34 }],
        // disconnect the org's current identifiers, then reconnect/create the shared rows
        identifiers: { set: [], connectOrCreate: [link] },
      },
    })
  })

  it('skips identifiers whose type is not a known AuthorityOrganizationIdentifierType', async () => {
    const org = new AuthorityOrganization(
      '123',
      ['Some Organization'],
      null,
      [],
      [
        {
          type: 'not-a-real-type' as AuthorityOrganizationIdentifierType,
          value: 'x',
        },
        { type: AuthorityOrganizationIdentifierType.ror, value: 'r1' },
      ],
    )

    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(org)

    const arg = upsertMock().mock.calls[0][0]
    expect(arg.create.identifiers.connectOrCreate).toEqual([
      {
        where: {
          type_value: {
            type: AuthorityOrganizationIdentifierType.ror,
            value: 'r1',
          },
        },
        create: { type: AuthorityOrganizationIdentifierType.ror, value: 'r1' },
      },
    ])
  })

  it('dedupes repeated (type, value) identifiers', async () => {
    const org = new AuthorityOrganization(
      '123',
      ['Some Organization'],
      null,
      [],
      [
        { type: AuthorityOrganizationIdentifierType.ror, value: 'r1' },
        { type: AuthorityOrganizationIdentifierType.ror, value: 'r1' },
      ],
    )

    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(org)

    const arg = upsertMock().mock.calls[0][0]
    expect(arg.update.identifiers.connectOrCreate).toHaveLength(1)
  })
})
