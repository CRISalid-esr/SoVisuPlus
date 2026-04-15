import { AuthorityOrganizationDAO } from '@/lib/daos/AuthorityOrganizationDAO'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifierType } from '@prisma/client'
import prisma from '@/lib/daos/prisma'

describe('AuthorityOrganizationDAO Integration Tests', () => {
  let authorityOrganizationDAO: AuthorityOrganizationDAO

  beforeEach(async () => {
    authorityOrganizationDAO = new AuthorityOrganizationDAO()
    await prisma.authorityOrganization.deleteMany()
  })

  const authorityOrganization = new AuthorityOrganization(
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

  test("should create an authority organization if it doesn't exist in database with its identifiers", async () => {
    const dbAuthorityOrganization =
      await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
        authorityOrganization,
      )

    expect(dbAuthorityOrganization).toHaveProperty('id')
    expect(dbAuthorityOrganization.uid).toBe('123')
    expect(dbAuthorityOrganization.displayNames).toHaveLength(1)
    expect(dbAuthorityOrganization.displayNames).toEqual(['Some Organization'])
    expect(dbAuthorityOrganization.places).toHaveLength(1)
    expect(dbAuthorityOrganization.places).toEqual([
      { latitude: 53, longitude: 34 },
    ])

    const identifiers = await prisma.authorityOrganizationIdentifier.findMany({
      where: { organizationId: dbAuthorityOrganization.id },
    })
    expect(identifiers).toHaveLength(1)
    expect(identifiers[0]).toMatchObject({
      type: AuthorityOrganizationIdentifierType.hal,
      value: '123',
      organizationId: dbAuthorityOrganization.id,
    })
  })

  test('should update an authority organization if it exists in database, delete all existing authority organization identifiers in relation to and create/connect new ones', async () => {
    const initialOrganization = await prisma.authorityOrganization.create({
      data: {
        uid: '123',
        displayNames: ['Initial Organization'],
        places: [{ latitude: 53, longitude: 34 }],
      },
    })

    await prisma.authorityOrganizationIdentifier.createMany({
      data: [
        {
          type: AuthorityOrganizationIdentifierType.idref,
          value: '456',
          organizationId: initialOrganization.id,
        },
      ],
    })

    const updatedDbAuthorityOrganization =
      await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
        authorityOrganization,
      )

    expect(updatedDbAuthorityOrganization.id).toBe(initialOrganization.id)
    expect(updatedDbAuthorityOrganization.uid).toBe(authorityOrganization.uid)
    expect(updatedDbAuthorityOrganization.displayNames).toEqual(
      authorityOrganization.displayNames,
    )
    expect(updatedDbAuthorityOrganization.places).toEqual(
      authorityOrganization.places,
    )

    const identifiers = await prisma.authorityOrganizationIdentifier.findMany({
      where: {
        organizationId: initialOrganization.id,
      },
    })
    expect(identifiers).toHaveLength(1)
    expect(identifiers[0]).toMatchObject(authorityOrganization.identifiers[0])
  })
})
