import { Person as DbPerson, PrismaClient } from '@prisma/client'
import { Person } from '@/types/Person'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { PersonMembership } from '@/types/PersonMembership'
import { ResearchStructure } from '@/types/ResearchStructure'
import { Literal } from '@/types/Literal'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'

jest.mock('@prisma/client', () => {
  // avoid PersonIdentifierType to be mocked
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')

  const mockResearchStructureFindUnique = jest.fn()

  mockResearchStructureFindUnique.mockResolvedValue({
    id: 1,
    slug: 'local-structure',
    type: 'ACR',
    names: [{ value: 'JD Laboratory', language: 'en' }],
    descriptions: [{ value: 'Laboratory of John Doe', language: 'en' }],
  })

  const mockPrismaClient = {
    person: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    personIdentifier: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    orcidIdentifier: {
      upsert: jest.fn(),
    },
    membership: {
      upsert: jest.fn(),
    },
    researchStructure: {
      findUnique: mockResearchStructureFindUnique,
    },
  }

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
    [new PersonIdentifier(PersonIdentifierType.ORCID, '0000-0001-2345-6789')],
    [
      new PersonMembership(
        new ResearchStructure(
          'local-structure',
          'ACR',
          [new Literal('JD Laboratory', 'en')],
          [new Literal('Laboratory of John Doe', 'en')],
          'ACR_signature',
          [],
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

    expect(mockPrisma.personIdentifier.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            type: 'ORCID',
            value: '0000-0001-2345-6789',
            personId: { not: 1 },
          },
        ],
      },
    })
  })

  it('should throw an error if conflicting identifiers are found', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([
      { type: 'ORCID', value: '0000-0001-2345-6789', personId: 999 },
    ])
    // for duplicate slug resolution
    ;(mockPrisma.person.findFirst as jest.Mock).mockResolvedValue(null)

    await expect(personDAO.createOrUpdatePerson(person)).rejects.toThrow(
      'Conflicting identifiers found: ORCID:0000-0001-2345-6789',
    )
  })

  it('should call deleteMany and createMany for upsertIdentifiers', async () => {
    ;(mockPrisma.personIdentifier.findMany as jest.Mock).mockResolvedValue([])

    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.personIdentifier.deleteMany).toHaveBeenCalledWith({
      where: { personId: expect.any(Number) },
    })

    expect(mockPrisma.personIdentifier.createMany).toHaveBeenCalledWith({
      data: [
        {
          personId: expect.any(Number),
          type: 'ORCID',
          value: '0000-0001-2345-6789',
        },
      ],
    })
  })

  it('should register person memberships', async () => {
    await personDAO.createOrUpdatePerson(person)

    expect(mockPrisma.membership.upsert).toHaveBeenCalledWith({
      where: {
        personId_researchStructureId: {
          personId: 1,
          researchStructureId: 1,
        },
      },
      update: {
        endDate: undefined,
        positionCode: undefined,
        startDate: undefined,
      },
      create: {
        personId: 1,
        researchStructureId: 1,
        endDate: undefined,
        positionCode: undefined,
        startDate: undefined,
      },
    })
  })
  describe('upsertOrcidIdentifierExtension', () => {
    it('should upsert ORCID oauth extension when base identifier exists and oauth is present', async () => {
      // base row exists and is ORCID
      ;(mockPrisma.personIdentifier.findUnique as jest.Mock).mockResolvedValue({
        id: 1841063,
        type: 'ORCID',
      })
      ;(mockPrisma.orcidIdentifier.upsert as jest.Mock).mockResolvedValue({
        id: 1841063,
      })

      const identifier = new ORCIDIdentifier('0000-0001-7990-9804', {
        accessToken: 'dev-access-token-xyz',
        refreshToken: 'dev-refresh-token-abc',
        scope: ['/read-limited'],
        tokenType: 'bearer',
        obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
        expiresAt: new Date('2027-02-01T12:34:28.632Z'),
      })

      await personDAO.upsertOrcidIdentifierExtension(1841063, identifier)

      expect(mockPrisma.personIdentifier.findUnique).toHaveBeenCalledWith({
        where: { id: 1841063 },
        select: { id: true, type: true },
      })

      expect(mockPrisma.orcidIdentifier.upsert).toHaveBeenCalledWith({
        where: { id: 1841063 },
        create: {
          id: 1841063,
          accessToken: 'dev-access-token-xyz',
          refreshToken: 'dev-refresh-token-abc',
          scope: '/read-limited',
          tokenType: 'bearer',
          obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
          expiresAt: new Date('2027-02-01T12:34:28.632Z'),
        },
        update: {
          id: 1841063,
          accessToken: 'dev-access-token-xyz',
          refreshToken: 'dev-refresh-token-abc',
          scope: '/read-limited',
          tokenType: 'bearer',
          obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
          expiresAt: new Date('2027-02-01T12:34:28.632Z'),
        },
      })
    })

    it('should throw if base identifier does not exist', async () => {
      ;(mockPrisma.personIdentifier.findUnique as jest.Mock).mockResolvedValue(
        null,
      )

      const identifier = new ORCIDIdentifier('0000-0001-7990-9804', {
        accessToken: 'a',
        refreshToken: 'r',
        scope: ['/read-limited'],
        tokenType: 'bearer',
        obtainedAt: new Date(),
        expiresAt: new Date(),
      })

      await expect(
        personDAO.upsertOrcidIdentifierExtension(1841063, identifier),
      ).rejects.toThrow('PersonIdentifier with id=1841063 not found')

      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })

    it('should throw if base identifier is not ORCID', async () => {
      ;(mockPrisma.personIdentifier.findUnique as jest.Mock).mockResolvedValue({
        id: 1841063,
        type: 'LOCAL',
      })

      const identifier = new ORCIDIdentifier('0000-0001-7990-9804', {
        accessToken: 'a',
        refreshToken: 'r',
        scope: ['/read-limited'],
        tokenType: 'bearer',
        obtainedAt: new Date(),
        expiresAt: new Date(),
      })

      await expect(
        personDAO.upsertOrcidIdentifierExtension(1841063, identifier),
      ).rejects.toThrow(
        'PersonIdentifier id=1841063 is not ORCID (found type=LOCAL)',
      )

      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })

    it('should throw if oauth is missing', async () => {
      ;(mockPrisma.personIdentifier.findUnique as jest.Mock).mockResolvedValue({
        id: 1841063,
        type: 'ORCID',
      })

      const identifier = new ORCIDIdentifier('0000-0001-7990-9804') // oauth missing

      await expect(
        personDAO.upsertOrcidIdentifierExtension(1841063, identifier),
      ).rejects.toThrow(
        'Missing OAuth data for ORCID identifier (personIdentifierId=1841063)',
      )

      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })

    it('should throw if accessToken/refreshToken are missing', async () => {
      ;(mockPrisma.personIdentifier.findUnique as jest.Mock).mockResolvedValue({
        id: 1841063,
        type: 'ORCID',
      })

      const identifier = new ORCIDIdentifier('0000-0001-7990-9804', {
        // accessToken missing
        refreshToken: 'r',
        scope: ['/read-limited'],
        tokenType: 'bearer',
        obtainedAt: new Date(),
        expiresAt: new Date(),
      })

      await expect(
        personDAO.upsertOrcidIdentifierExtension(1841063, identifier),
      ).rejects.toThrow(
        'Missing accessToken/refreshToken for ORCID identifier (personIdentifierId=1841063)',
      )

      expect(mockPrisma.orcidIdentifier.upsert).not.toHaveBeenCalled()
    })
  })
})
