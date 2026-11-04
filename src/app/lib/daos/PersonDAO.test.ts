import {
  Person as DbPerson,
  PrismaClient,
  OrganizationCategory,
  OrganizationGenericType,
} from '@prisma/client'
import { Person } from '@/types/Person'
import {
  IdentifierConflictError,
  PersonAlreadyExistsError,
  PersonDAO,
} from '@/lib/daos/PersonDAO'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PersonMembership } from '@/types/PersonMembership'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import {
  decryptString,
  isEncryptedString,
} from '@/utils/crypto/fieldEncryption'
import { loadKeyringFromEnv } from '@/utils/crypto/keyring'
import { CreateActionParams } from '@/lib/daos/ActionDAO'

jest.mock('@prisma/client', () => {
  // avoid PersonIdentifierType to be mocked
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')

  const mockOrganizationUnitFindUnique = jest.fn()

  mockOrganizationUnitFindUnique.mockResolvedValue({
    id: 1,
    uid: 'local-unit',
    slug: 'org:acr',
    acronym: 'ACR',
    labels: [{ kind: 'long', value: 'JD Laboratory', language: 'en' }],
    descriptions: [{ value: 'Laboratory of John Doe', language: 'en' }],
    identifiers: [],
  })

  const mockPrismaClient: Record<string, unknown> = {
    person: {
      upsert: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    personIdentifier: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    orcidIdentifier: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    action: {
      create: jest.fn(),
    },
    membership: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    employment: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    sourcePerson: {
      updateMany: jest.fn(),
    },
    organizationUnit: {
      findUnique: mockOrganizationUnitFindUnique,
    },
  }
  // Interactive-transaction mock: run the callback against the same client
  mockPrismaClient.$transaction = jest.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrismaClient),
  )

  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})
const mockPrisma = new PrismaClient()

describe('PersonDAO', () => {
  let personDAO: PersonDAO
  beforeEach(() => {
    jest.clearAllMocks()
    personDAO = new PersonDAO()
  })
  const person: Person = new Person(
    'local-johndoe',
    false,
    'johndoe@myuniversity.com',
    'John Doe',
    'John',
    'Doe',
    [new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-2345-6789')],
    [
      new PersonMembership(
        new OrganizationUnit(
          'local-unit',
          'ACR',
          [new Literal('JD Laboratory', 'en')],
          [new Literal('Laboratory of John Doe', 'en')],
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
        ),
      ),
    ],
  )

  it('should upsert a person', async () => {
    ;(mockPrisma.person.upsert as jest.Mock).mockResolvedValue({
      ...person,
      id: 1,
    })
    ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([])
    const dbPerson: DbPerson = await personDAO.createOrUpdatePerson(person)
    expect(dbPerson.uid).toEqual('local-johndoe')
    expect(dbPerson.email).toEqual('johndoe@myuniversity.com')
    expect(mockPrisma.person.upsert).toHaveBeenCalledWith({
      where: { uid: person.uid },
      update: {
        email: person.email,
        displayName: person.displayName,
        firstName: person.firstName,
        lastName: person.lastName,
        normalizedName: 'john doe',
        slug: 'person:john-doe',
        external: person.external,
      },
      create: {
        uid: person.uid,
        email: person.email,
        displayName: person.displayName,
        firstName: person.firstName,
        lastName: person.lastName,
        normalizedName: 'john doe',
        slug: 'person:john-doe',
        external: person.external,
      },
    })
  })

  it('should throw an error if conflicting identifiers are found', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([
      { type: 'orcid', value: '0000-0001-2345-6789', personId: 999 },
    ])
    // for duplicate slug resolution
    ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue(null)

    await expect(personDAO.createOrUpdatePerson(person)).rejects.toThrow(
      'Conflicting identifiers found: orcid:0000-0001-2345-6789',
    )
  })

  it('should create identifiers missing from the database', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([])

    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.personIdentifier.create).toHaveBeenCalledWith({
      data: {
        personId: expect.any(Number),
        type: 'orcid',
        value: '0000-0001-2345-6789',
        validated: false,
      },
    })
    expect(mockPrisma.personIdentifier.update).not.toHaveBeenCalled()
  })

  it('should keep an unchanged identifier row in place', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // identifier conflict check
      .mockResolvedValueOnce([
        {
          id: 7,
          type: 'orcid',
          value: '0000-0001-2345-6789',
          validated: false,
        },
      ])

    await personDAO.createOrUpdatePerson(person, { authoritative: true })

    expect(mockPrisma.personIdentifier.create).not.toHaveBeenCalled()
    expect(mockPrisma.personIdentifier.update).not.toHaveBeenCalled()
    expect(mockPrisma.orcidIdentifier.deleteMany).not.toHaveBeenCalled()
  })

  it('should update a changed identifier and drop its ORCID extension', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // identifier conflict check
      .mockResolvedValueOnce([
        { id: 7, type: 'orcid', value: '0000-0002-0000-0000' },
      ])

    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.orcidIdentifier.deleteMany).toHaveBeenCalledWith({
      where: { id: 7 },
    })
    expect(mockPrisma.personIdentifier.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { value: '0000-0001-2345-6789', validated: false },
    })
  })

  it('should register person memberships', async () => {
    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.membership.upsert).toHaveBeenCalledWith({
      where: {
        personId_organizationUnitId: {
          personId: 1,
          organizationUnitId: 1,
        },
      },
      update: {
        endDate: undefined,
        positionCode: undefined,
        startDate: undefined,
      },
      create: {
        personId: 1,
        organizationUnitId: 1,
        endDate: undefined,
        positionCode: undefined,
        startDate: undefined,
      },
    })
  })

  it('should not prune relations by default', async () => {
    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.membership.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.employment.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.sourcePerson.updateMany).not.toHaveBeenCalled()
  })

  it('should prune relations absent from authoritative data', async () => {
    await personDAO.createOrUpdatePerson(person, { authoritative: true })

    expect(mockPrisma.membership.deleteMany).toHaveBeenCalledWith({
      where: {
        personId: 1,
        organizationUnit: { uid: { notIn: ['local-unit'] } },
      },
    })
    // No employment in the incoming data: every existing row is obsolete.
    expect(mockPrisma.employment.deleteMany).toHaveBeenCalledWith({
      where: {
        personId: 1,
        organizationUnit: { uid: { notIn: [] } },
      },
    })
    // Source persons are unlinked, not deleted (document records reference them)
    expect(mockPrisma.sourcePerson.updateMany).toHaveBeenCalledWith({
      where: { personId: 1, uid: { notIn: [] } },
      data: { personId: null },
    })
  })

  it('should keep unhydrated affiliation org uids out of the prune set', async () => {
    const partiallyHydrated = new Person(
      person.uid,
      person.external,
      person.email,
      person.displayName,
      person.firstName,
      person.lastName,
      person.getIdentifiers(),
      person.memberships,
    )
    partiallyHydrated.unhydratedMembershipOrgUids = ['mystery-unit']

    await personDAO.createOrUpdatePerson(partiallyHydrated, {
      authoritative: true,
    })

    expect(mockPrisma.membership.deleteMany).toHaveBeenCalledWith({
      where: {
        personId: 1,
        organizationUnit: { uid: { notIn: ['local-unit', 'mystery-unit'] } },
      },
    })
  })

  describe('createPerson', () => {
    it('should create the person strictly, without upserting', async () => {
      ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.person.create as jest.Mock).mockResolvedValue({
        id: 5,
        uid: person.uid,
      })

      const dbPerson = await personDAO.createPerson(person)

      expect(dbPerson.id).toBe(5)
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ uid: 'local-johndoe' }),
      })
      expect(mockPrisma.person.upsert).not.toHaveBeenCalled()
    })

    it('should throw PersonAlreadyExistsError when the uid is taken', async () => {
      ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.person.create as jest.Mock).mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['uid'] },
        }),
      )

      await expect(personDAO.createPerson(person)).rejects.toThrow(
        PersonAlreadyExistsError,
      )
    })
  })

  // Encryption keys for the ORCID tokens (32 bytes, base64)
  process.env.FIELD_ENC_PRIMARY_KID = 'k2026_02'
  process.env.FIELD_ENC_KEYS_JSON = JSON.stringify({
    k2026_02: Buffer.alloc(32, 7).toString('base64'),
  })

  const authenticatedOrcid = () =>
    new ORCIDIdentifier('0000-0001-7990-9804', {
      accessToken: 'dev-access-token-xyz',
      refreshToken: 'dev-refresh-token-abc',
      scope: ['/read-limited'],
      tokenType: 'bearer',
      obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
      expiresAt: new Date('2027-02-01T12:34:28.632Z'),
    })

  describe('identifier unique-constraint conflicts', () => {
    // In the Next.js server bundle, Prisma errors are not instances of the
    // PrismaClientKnownRequestError class imported by the DAO: only the shape
    // (code + meta) can be relied on.
    const foreignP2002 = (target: string[]) =>
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target },
      })

    beforeEach(() => {
      ;(mockPrisma.person.findUnique as jest.Mock).mockResolvedValue({ id: 5 })
    })

    it('createIdentifiers reports a value held by another person', async () => {
      ;(mockPrisma.personIdentifier.createMany as jest.Mock).mockRejectedValue(
        foreignP2002(['type', 'value']),
      )

      const promise = personDAO.createIdentifiers(
        [
          new PersonIdentifier(
            PersonIdentifierType.orcid,
            '0000-0002-8947-4151',
          ),
        ],
        'local-johndoe',
      )

      await expect(promise).rejects.toBeInstanceOf(IdentifierConflictError)
      await expect(promise).rejects.toMatchObject({
        reason: 'used_by_another_person',
      })
    })

    it('createIdentifiers reports a type the person already holds', async () => {
      ;(mockPrisma.personIdentifier.createMany as jest.Mock).mockRejectedValue(
        foreignP2002(['personId', 'type']),
      )

      await expect(
        personDAO.createIdentifiers(
          [
            new PersonIdentifier(
              PersonIdentifierType.orcid,
              '0000-0002-8947-4151',
            ),
          ],
          'local-johndoe',
        ),
      ).rejects.toMatchObject({ reason: 'slot_taken' })
    })

    it('upsertAuthenticatedOrcidIdentifier reports an ORCID held by another person', async () => {
      ;(mockPrisma.personIdentifier.upsert as jest.Mock).mockRejectedValue(
        foreignP2002(['type', 'value']),
      )

      await expect(
        personDAO.upsertAuthenticatedOrcidIdentifier(
          'local-johndoe',
          authenticatedOrcid(),
        ),
      ).rejects.toMatchObject({ reason: 'used_by_another_person' })
      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })

    it('upsertAuthenticatedOrcidIdentifier rethrows other unique-constraint conflicts as is', async () => {
      const conflict = foreignP2002(['personId', 'type'])
      ;(mockPrisma.personIdentifier.upsert as jest.Mock).mockRejectedValue(
        conflict,
      )

      await expect(
        personDAO.upsertAuthenticatedOrcidIdentifier(
          'local-johndoe',
          authenticatedOrcid(),
        ),
      ).rejects.toBe(conflict)
    })
  })

  describe('upsertAuthenticatedOrcidIdentifier', () => {
    beforeEach(() => {
      ;(mockPrisma.person.findUnique as jest.Mock).mockResolvedValue({ id: 5 })
      ;(mockPrisma.personIdentifier.upsert as jest.Mock).mockResolvedValue({
        id: 1841063,
      })
    })

    it('writes the ORCID row, its encrypted OAuth extension and the actions', async () => {
      const action = {
        actionType: 'ADD',
        targetType: 'PERSON',
        targetUid: 'local-johndoe',
        parameters: {},
        personUid: 'local-johndoe',
      } as unknown as CreateActionParams

      await personDAO.upsertAuthenticatedOrcidIdentifier(
        'local-johndoe',
        authenticatedOrcid(),
        [action],
      )

      expect(mockPrisma.personIdentifier.upsert).toHaveBeenCalledWith({
        where: {
          personId_type: { personId: 5, type: PersonIdentifierType.orcid },
        },
        update: { value: '0000-0001-7990-9804' },
        create: {
          personId: 5,
          type: PersonIdentifierType.orcid,
          value: '0000-0001-7990-9804',
        },
      })
      expect(mockPrisma.action.create).toHaveBeenCalledWith({
        data: { path: null, ...action },
      })

      const calls = (mockPrisma.orcidIdentifier.upsert as jest.Mock).mock.calls
      expect(calls).toHaveLength(1)
      const arg = calls[0]?.[0] as {
        where: { id: number }
        create: {
          id: number
          accessToken: string
          refreshToken: string
          scope: string
          tokenType: string | null
          obtainedAt: Date | null
          expiresAt: Date | null
        }
        update: { accessToken: string; refreshToken: string }
      }

      // The extension shares the id of the ORCID row
      expect(arg.where).toEqual({ id: 1841063 })
      expect(arg.create.id).toBe(1841063)

      // Tokens are encrypted, never stored in plaintext
      expect(isEncryptedString(arg.create.accessToken)).toBe(true)
      expect(isEncryptedString(arg.create.refreshToken)).toBe(true)
      expect(isEncryptedString(arg.update.accessToken)).toBe(true)
      expect(isEncryptedString(arg.update.refreshToken)).toBe(true)

      expect(arg.create.scope).toBe('/read-limited')
      expect(arg.create.tokenType).toBe('bearer')
      expect(arg.create.obtainedAt).toEqual(
        new Date('2026-02-01T12:34:28.632Z'),
      )
      expect(arg.create.expiresAt).toEqual(new Date('2027-02-01T12:34:28.632Z'))

      // Round-trip decrypt with the AAD bound to the row
      const keyring = loadKeyringFromEnv()
      const aad = PersonDAO.getORCIDIdentifierAad(1841063)
      expect(decryptString(arg.create.accessToken, keyring, { aad })).toBe(
        'dev-access-token-xyz',
      )
      expect(decryptString(arg.create.refreshToken, keyring, { aad })).toBe(
        'dev-refresh-token-abc',
      )
    })

    it('throws and writes nothing if oauth is missing', async () => {
      await expect(
        personDAO.upsertAuthenticatedOrcidIdentifier(
          'local-johndoe',
          new ORCIDIdentifier('0000-0001-7990-9804'),
        ),
      ).rejects.toThrow(
        'Missing OAuth data for ORCID identifier (value=0000-0001-7990-9804)',
      )

      expect(mockPrisma.personIdentifier.upsert).not.toHaveBeenCalled()
      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })

    it('throws and writes nothing if accessToken/refreshToken are missing', async () => {
      const identifier = new ORCIDIdentifier('0000-0001-7990-9804', {
        // accessToken missing
        refreshToken: 'r',
        scope: ['/read-limited'],
        tokenType: 'bearer',
        obtainedAt: new Date(),
        expiresAt: new Date(),
      })

      await expect(
        personDAO.upsertAuthenticatedOrcidIdentifier(
          'local-johndoe',
          identifier,
        ),
      ).rejects.toThrow(
        'Missing accessToken/refreshToken for ORCID identifier (value=0000-0001-7990-9804)',
      )

      expect(mockPrisma.personIdentifier.upsert).not.toHaveBeenCalled()
      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })
  })
})
