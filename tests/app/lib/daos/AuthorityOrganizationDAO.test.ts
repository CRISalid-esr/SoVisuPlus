import { AuthorityOrganizationDAO } from '@/lib/daos/AuthorityOrganizationDAO'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import {
  AuthorityOrganizationIdentifierType,
  AuthorityOrganizationType,
} from '@prisma/client'
import prisma from '@/lib/daos/prisma'

describe('AuthorityOrganizationDAO Integration Tests', () => {
  let authorityOrganizationDAO: AuthorityOrganizationDAO

  beforeEach(async () => {
    authorityOrganizationDAO = new AuthorityOrganizationDAO()
    await prisma.authorityOrganization.deleteMany()
    await prisma.authorityOrganizationIdentifier.deleteMany()
  })

  const authorityOrganization = new AuthorityOrganization(
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

  const identifiersOf = async (uid: string) =>
    (
      await prisma.authorityOrganization.findUniqueOrThrow({
        where: { uid },
        include: { identifiers: true },
      })
    ).identifiers

  test("should create an authority organization if it doesn't exist in database with its identifiers", async () => {
    const dbAuthorityOrganization =
      await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
        authorityOrganization,
      )

    expect(dbAuthorityOrganization).toHaveProperty('id')
    expect(dbAuthorityOrganization.uid).toBe('123')
    expect(dbAuthorityOrganization.displayNames).toEqual(['Some Organization'])
    expect(dbAuthorityOrganization.places).toEqual([
      { latitude: 53, longitude: 34 },
    ])

    const identifiers = await identifiersOf('123')
    expect(identifiers).toHaveLength(1)
    expect(identifiers[0]).toMatchObject({
      type: AuthorityOrganizationIdentifierType.hal,
      value: '123',
    })
  })

  test('should update an authority organization, disconnecting its previous identifiers and connecting the new ones', async () => {
    const initialOrganization = await prisma.authorityOrganization.create({
      data: {
        uid: '123',
        displayNames: ['Initial Organization'],
        places: [{ latitude: 53, longitude: 34 }],
        identifiers: {
          create: [
            {
              type: AuthorityOrganizationIdentifierType.idref,
              value: '456',
            },
          ],
        },
      },
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

    const identifiers = await identifiersOf('123')
    expect(identifiers).toHaveLength(1)
    expect(identifiers[0]).toMatchObject(authorityOrganization.identifiers[0])
  })

  test('should share a single identifier row across authority organizations that carry the same (type, value)', async () => {
    // Regression: apollo denormalises identifiers across an org's root and states, so the
    // same identifier value legitimately arrives on multiple AuthorityOrganization rows.
    // Persisting the second org must reuse the shared identifier row, not fail on the unique.
    const sharedIdentifier = {
      type: AuthorityOrganizationIdentifierType.ror,
      value: 'shared-ror',
    }

    const orgA = new AuthorityOrganization(
      'org-A',
      ['Organization A'],
      AuthorityOrganizationType.laboratory,
      [],
      [sharedIdentifier],
    )
    const orgB = new AuthorityOrganization(
      'org-B',
      ['Organization B'],
      AuthorityOrganizationType.institution,
      [],
      [sharedIdentifier],
    )

    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(orgA)
    // Before the many-to-many fix this second call threw on the global (type, value) unique.
    await expect(
      authorityOrganizationDAO.createOrUpdateAuthorityOrganization(orgB),
    ).resolves.toBeDefined()

    expect(await identifiersOf('org-A')).toMatchObject([sharedIdentifier])
    expect(await identifiersOf('org-B')).toMatchObject([sharedIdentifier])

    // Exactly one shared identifier row exists, linked to both organizations.
    const rows = await prisma.authorityOrganizationIdentifier.findMany({
      where: { type: sharedIdentifier.type, value: sharedIdentifier.value },
      include: { organizations: true },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].organizations.map((o) => o.uid).sort()).toEqual([
      'org-A',
      'org-B',
    ])
  })

  test('should dedupe repeated (type, value) identifiers on the same organization', async () => {
    const orgWithDuplicates = new AuthorityOrganization(
      'dup',
      ['Dup Org'],
      AuthorityOrganizationType.laboratory,
      [],
      [
        { type: AuthorityOrganizationIdentifierType.ror, value: 'r1' },
        { type: AuthorityOrganizationIdentifierType.ror, value: 'r1' },
      ],
    )

    await authorityOrganizationDAO.createOrUpdateAuthorityOrganization(
      orgWithDuplicates,
    )

    expect(await identifiersOf('dup')).toHaveLength(1)
  })
})
