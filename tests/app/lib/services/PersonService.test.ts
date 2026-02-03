import prisma from '@/lib/daos/prisma'
import { PersonService } from '@/lib/services/PersonService'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import {
  decryptString,
  isEncryptedString,
} from '@/utils/crypto/fieldEncryption'
import { loadKeyringFromEnv } from '@/utils/crypto/keyring'
import { PersonDAO } from '@/lib/daos/PersonDAO'

describe('PersonService Integration Tests', () => {
  let personService: PersonService

  beforeAll(async () => {
    personService = new PersonService()
  })

  afterEach(async () => {
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should find a person by name ', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'johndoe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        external: false,
        normalizedName: 'john doe',
      },
    })

    const result = await personService.fetchPeople('Doe', 1, false, 10)
    expect(result.people).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
    expect(result.people[0].uid).toBe(person.uid)
    expect(result.people[0].email).toBe(person.email)
    expect(result.people[0].firstName).toBe(person.firstName)
    expect(result.people[0].lastName).toBe(person.lastName)
  })
  test('should find a person by name ignoring case', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'johndoe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        normalizedName: 'john doe',
      },
    })
    const result = await personService.fetchPeople('dOe', 1, false, 10)
    expect(result.people).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
    expect(result.people[0].uid).toBe(person.uid)
  })
  test('should find a person by name ignoring accents', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'existing-test123',
        email: 'johndoe@example.com',
        firstName: 'Cécile',
        lastName: 'Doe',
        normalizedName: 'cecile doe',
      },
    })
    const result = await personService.fetchPeople('cecile', 1, false, 10)
    expect(result.people).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
    expect(result.people[0].uid).toBe(person.uid)
  })

  test('should add/update ORCID identifier and persist ORCID oauth extension', async () => {
    // Arrange: create a person
    const person = await prisma.person.create({
      data: {
        uid: 'person-orcid-1',
        email: 'orciduser@example.com',
        firstName: 'Orcid',
        lastName: 'User',
        normalizedName: 'orcid user',
        external: false,
      },
    })

    const obtainedAt = new Date('2026-01-01T00:00:00.000Z')
    const expiresAt = new Date('2026-01-01T01:00:00.000Z')

    const identifier = new ORCIDIdentifier('0000-0001-2345-6789', {
      accessToken: 'access-token-xyz',
      refreshToken: 'refresh-token-abc',
      tokenType: 'bearer',
      scope: ['/read-limited'],
      obtainedAt,
      expiresAt,
    })

    // Act
    await personService.addOrUpdateOrcidIdentifier(person.uid, identifier)

    // Assert: base identifier exists
    const dbPerson = await prisma.person.findUnique({
      where: { uid: person.uid },
      include: {
        identifiers: {
          include: {
            orcidIdentifier: true,
          },
        },
      },
    })

    expect(dbPerson).not.toBeNull()

    const orcidBase = dbPerson!.identifiers.find((i) => i.type === 'ORCID')
    // Assert: ORCID extension exists
    expect(orcidBase!.orcidIdentifier).toBeTruthy()

    const ext = orcidBase!.orcidIdentifier!

    // Tokens must be encrypted at rest
    expect(isEncryptedString(ext.accessToken)).toBe(true)
    expect(isEncryptedString(ext.refreshToken)).toBe(true)

    // Round-trip decrypt to prove correctness
    const keyring = loadKeyringFromEnv()
    const aad = PersonDAO.getORCIDIdentifierAad(ext.id)

    expect(decryptString(ext.accessToken!, keyring, { aad })).toBe(
      'access-token-xyz',
    )
    expect(decryptString(ext.refreshToken!, keyring, { aad })).toBe(
      'refresh-token-abc',
    )

    // Non-secret fields remain directly comparable
    expect(ext.tokenType).toBe('bearer')
    expect(ext.scope).toBe('/read-limited')
    expect(ext.obtainedAt.toISOString()).toBe(obtainedAt.toISOString())
    expect(ext.expiresAt!.toISOString()).toBe(expiresAt.toISOString())
  })

  test('should update ORCID oauth extension when called twice (same base identifier)', async () => {
    // Arrange
    const person = await prisma.person.create({
      data: {
        uid: 'person-orcid-2',
        email: 'orciduser2@example.com',
        firstName: 'Orcid2',
        lastName: 'User2',
        normalizedName: 'orcid2 user2',
        external: false,
      },
    })

    const first = new ORCIDIdentifier('0000-0001-2345-6789', {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      tokenType: 'bearer',
      scope: ['/read-limited'],
      obtainedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-01T01:00:00.000Z'),
    })

    const second = new ORCIDIdentifier('0000-0001-2345-6789', {
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
      tokenType: 'bearer',
      scope: ['/read-limited'],
      obtainedAt: new Date('2026-01-02T00:00:00.000Z'),
      expiresAt: new Date('2026-01-02T01:00:00.000Z'),
    })

    // Act
    await personService.addOrUpdateOrcidIdentifier(person.uid, first)
    await personService.addOrUpdateOrcidIdentifier(person.uid, second)

    // Assert: still only one ORCID base identifier for that person
    const dbPerson = await prisma.person.findUnique({
      where: { uid: person.uid },
      include: {
        identifiers: {
          include: {
            orcidIdentifier: true,
          },
        },
      },
    })

    const orcidIdentifiers = dbPerson!.identifiers.filter(
      (i) => i.type === 'ORCID',
    )
    expect(orcidIdentifiers).toHaveLength(1)

    const ext = orcidIdentifiers[0].orcidIdentifier
    expect(ext).toBeTruthy()
    expect(ext!.accessToken).toBeDefined()
    expect(ext!.refreshToken).toBeDefined()
    // check decrypted value
    const keyring = loadKeyringFromEnv()
    const aad = PersonDAO.getORCIDIdentifierAad(ext!.id)
    expect(decryptString(ext!.accessToken!, keyring, { aad })).toBe(
      'access-token-2',
    )
    expect(decryptString(ext!.refreshToken!, keyring, { aad })).toBe(
      'refresh-token-2',
    )
    expect(ext!.tokenType).toBe('bearer')
    expect(ext!.scope).toBe('/read-limited')
    expect(ext!.obtainedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z')
  })

  test('should throw if ORCID oauth data is missing', async () => {
    const person = await prisma.person.create({
      data: {
        uid: 'person-orcid-3',
        email: 'orciduser3@example.com',
        firstName: 'Orcid3',
        lastName: 'User3',
        normalizedName: 'orcid3 user3',
        external: false,
      },
    })

    const identifier = new ORCIDIdentifier('0000-0001-2345-6789') // no oauth

    await expect(
      personService.addOrUpdateOrcidIdentifier(person.uid, identifier),
    ).rejects.toThrow(/Error adding\/updating ORCID identifier/i)
  })
})
