import slugify from 'slugify'
import {
  OrganizationCategory,
  OrganizationRelationKind,
  Person as DbPerson,
  Prisma,
} from '@prisma/client'
import { Person } from '@/types/Person'
import {
  ID_HAL_TYPES,
  IdentifierConflictReason,
  isIdHalType,
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { CreateActionParams } from '@/lib/daos/ActionDAO'
import { identifiersWithOrcidGrantInclude } from '@/lib/daos/personIncludes'
import {
  isUniqueConstraintError,
  UniqueConstraintError,
} from '@/lib/daos/prismaErrors'
import { PersonMembership } from '@/types/PersonMembership'
import {
  organizationUnitInclude,
  organizationUnitParentsInclude,
} from '@/prisma-schema/extended-client'
import { PersonEmployment } from '@/types/PersonEmployment'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationGroup } from '@/types/IAgent'
import { SourcePersonDAO } from '@/lib/daos/SourcePersonDAO'
import { SourcePerson } from '@/types/SourcePerson'
import { StructureMember } from '@/types/StructureMember'
import { ORCIDIdentifier, OrcidOAuthData } from '@/types/OrcidIdentifier'
import { loadKeyringFromEnv } from '@/utils/crypto/keyring'
import { decryptString, encryptString } from '@/utils/crypto/fieldEncryption'
import { backfillNormalizedColumn } from '@/lib/daos/search/backfillNormalizedColumn'
import {
  buildTokenMatch,
  withWordSimilarityThreshold,
} from '@/lib/daos/search/trigramSearchSql'
import { tokenizeSearchQuery } from '@/utils/fuzzySearch/fuzzySearch'
/**
 * Thrown when an identifier cannot be created because one already exists —
 * either the person already has an identifier of that type, or the value is
 * already used by another person (`@@unique([type, value])`). Callers translate
 * this into a 409 (remove-before-add).
 */
const organizationUnitWithParentsInclude = {
  include: {
    labels: true,
    parents: { include: { parent: true } },
    identifiers: true,
    descriptions: true,
  },
} satisfies Prisma.OrganizationUnitDefaultArgs

/** Relations mapped by Person.fromDbPerson for people search results. */
const peopleSearchInclude = {
  memberships: {
    include: { organizationUnit: organizationUnitWithParentsInclude },
  },
  employments: {
    include: { organizationUnit: organizationUnitWithParentsInclude },
  },
  identifiers: true,
  records: { include: { identifiers: true } },
} satisfies Prisma.PersonInclude

/** Relations mapped by Person.fromDbPerson for a single person's account. */
const personDetailInclude = {
  ...peopleSearchInclude,
  identifiers: identifiersWithOrcidGrantInclude,
} satisfies Prisma.PersonInclude

/** Identifier types written locally and never sent back by the graph. */
const LOCAL_ONLY_IDENTIFIER_TYPES: PersonIdentifierType[] = [
  PersonIdentifierType.hal_login,
]

/** Record outgoing actions inside a transaction, next to the change they announce. */
const recordActions = async (
  tx: Prisma.TransactionClient,
  actions: CreateActionParams[],
): Promise<void> => {
  for (const action of actions) {
    await tx.action.create({ data: { path: null, ...action } })
  }
}

export class IdentifierConflictError extends Error {
  constructor(
    public readonly reason: IdentifierConflictReason = 'slot_taken',
    message = 'Identifier already exists',
  ) {
    super(message)
    this.name = 'IdentifierConflictError'
  }
}

/**
 * Reads which unique constraint a P2002 error hit: (type, value) means the
 * value belongs to another person; (personId, type) means this person already
 * has an identifier of that type.
 */
const identifierConflictReason = (
  error: UniqueConstraintError,
): IdentifierConflictReason =>
  String(error.meta?.target ?? '').includes('value')
    ? 'used_by_another_person'
    : 'slot_taken'

/**
 * Thrown by {@link PersonDAO.createPerson} when a person with the same uid
 * already exists. Guarantees create-only semantics even against a concurrent
 * AMQP upsert (the unique constraint fires, not a silent overwrite).
 */
export class PersonAlreadyExistsError extends Error {
  constructor(uid: string) {
    super(`Person with uid ${uid} already exists`)
    this.name = 'PersonAlreadyExistsError'
  }
}

/** PersonDAO: Handles operations related to Person and PersonIdentifiers */
export class PersonDAO extends AbstractDAO {
  static ORCID_IDENTIFIER_AAD_PREFIX = 'orcidIdentifier:id='

  /**
   * Create or update a Person record in the database
   * @param person - The Person object to upsert
   * @param options - `authoritative: true` when the person carries their
   *   complete relation sets (the person AMQP message): memberships and
   *   employments absent from the incoming data are then deleted, and
   *   source-person records absent from it are unlinked. Callers with partial
   *   data (document contributors) must keep the default upsert-only mode.
   * @returns The created or updated Person record
   */
  public async createOrUpdatePerson(
    person: Person,
    options?: { authoritative?: boolean },
  ): Promise<DbPerson> {
    const authoritative = options?.authoritative ?? false
    try {
      const { baseSlug, uniqueSlug: initialSlug } =
        await this.computeUniqueSlug(person)
      let uniqueSlug = initialSlug
      let counter = 1
      const maxRetries = 3
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const dbPerson = await this.prismaClient.person.upsert({
            where: { uid: person.uid },
            update: {
              email: person.email,
              displayName: person.displayName,
              firstName: person.firstName,
              lastName: person.lastName,
              external: person.external,
              slug: uniqueSlug,
              normalizedName: person.normalizedName,
            },
            create: {
              uid: person.uid,
              email: person.email,
              displayName: person.displayName,
              firstName: person.firstName,
              lastName: person.lastName,
              external: person.external,
              slug: uniqueSlug,
              normalizedName: person.normalizedName,
            },
          })

          await this.handleIdentifierConflicts(
            person.getIdentifiers(),
            dbPerson?.id,
          )

          await this.upsertIdentifiers(person.getIdentifiers(), dbPerson.id, {
            prune: authoritative,
          })

          await this.upsertMemberships(
            person.memberships,
            dbPerson.id,
            authoritative
              ? {
                  keepOrgUids: [
                    ...person.memberships.map((m) => m.organizationUnit.uid),
                    ...person.unhydratedMembershipOrgUids,
                  ],
                }
              : undefined,
          )

          await this.upsertEmployments(
            person.employments,
            dbPerson.id,
            authoritative
              ? {
                  keepOrgUids: [
                    ...person.employments.map((e) => e.organizationUnit.uid),
                    ...person.unhydratedEmploymentOrgUids,
                  ],
                }
              : undefined,
          )

          await this.upsertRecords(person.records, dbPerson.id, authoritative)

          // The upsert result carries every scalar column callers read (id, external,
          // uid, …); the person's relations are written above but never consumed off the
          // return value, so there is no need to re-fetch them here.
          return dbPerson
        } catch (error) {
          if (isUniqueConstraintError(error) && baseSlug) {
            console.error(
              `Slug collision detected for '${uniqueSlug}', retrying...`,
            )

            uniqueSlug = `${baseSlug}-${counter}`
            counter++

            const delay = Math.floor(
              Math.random() * (100 * Math.pow(2, attempt)),
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
          } else {
            throw error
          }
        }
      }
      throw new Error(`Num of max retries reached`)
    } catch (error) {
      console.error('Error during person upsert:', error)
      throw new Error(
        `Failed to upsert person: ${(error as unknown as Error).message}`,
      )
    }
  }

  /**
   * Create a Person record, strictly. Unlike {@link createOrUpdatePerson} this
   * never overwrites an existing person: it throws
   * {@link PersonAlreadyExistsError} when the uid is already taken — including
   * when the conflict only surfaces at the database level, closing the
   * check-then-create race with a concurrent AMQP message. Used by manual
   * provisioning, which must never touch a graph-synced person.
   * @param person - The Person object to create
   * @returns The created Person record
   */
  public async createPerson(person: Person): Promise<DbPerson> {
    const { baseSlug, uniqueSlug: initialSlug } =
      await this.computeUniqueSlug(person)
    let uniqueSlug = initialSlug
    let counter = 1
    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const dbPerson = await this.prismaClient.person.create({
          data: {
            uid: person.uid,
            email: person.email,
            displayName: person.displayName,
            firstName: person.firstName,
            lastName: person.lastName,
            external: person.external,
            slug: uniqueSlug,
            normalizedName: person.normalizedName,
          },
        })

        await this.handleIdentifierConflicts(
          person.getIdentifiers(),
          dbPerson.id,
        )
        await this.upsertIdentifiers(person.getIdentifiers(), dbPerson.id, {
          prune: false,
        })

        return dbPerson
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          const target = error.meta?.target
          const fields = Array.isArray(target) ? target : [String(target)]
          if (fields.some((field) => String(field).includes('uid'))) {
            throw new PersonAlreadyExistsError(person.uid)
          }
          if (baseSlug) {
            console.error(
              `Slug collision detected for '${uniqueSlug}', retrying...`,
            )
            uniqueSlug = `${baseSlug}-${counter}`
            counter++
            continue
          }
        }
        throw error
      }
    }
    throw new Error(`Num of max retries reached`)
  }

  /**
   * Compute the person's unique slug (`person:<first>-<last>`, suffixed with a
   * counter on collision). `baseSlug` can be null for people with only a
   * display name; `uniqueSlug` is then null too.
   */
  private async computeUniqueSlug(
    person: Person,
  ): Promise<{ baseSlug: string | null; uniqueSlug: string | null }> {
    const slugPrefix = 'person:'
    let baseSlug: string | null = slugify(
      `${person.firstName}-${person.lastName}`,
      {
        lower: true,
        strict: true,
      },
    )
    baseSlug = baseSlug ? `${slugPrefix}${baseSlug}` : null

    let uniqueSlug = null
    let counter = 1
    if (baseSlug?.trim()) {
      uniqueSlug = baseSlug
      while (await this.slugExists(uniqueSlug, person.uid)) {
        uniqueSlug = `${baseSlug}-${counter}`
        counter++
      }
    }
    return { baseSlug, uniqueSlug }
  }

  /**
   * Upsert memberships for a given person.
   *
   * With `replace`, memberships whose organization unit uid is not in
   * `keepOrgUids` are deleted first: the person's message carries the person's
   * complete membership set, whereas an organization unit's message never
   * enumerates its members — so this is the only place that can prune them.
   * The prune and the upserts run in one transaction so a crash cannot leave
   * the person without affiliations. Units that fail to resolve are harmless
   * in the keep-set: a membership row cannot reference an organization unit
   * absent from the database.
   * @param memberships - List of memberships to upsert
   * @param personId - The ID of the person in the database
   * @param replace - When set, delete memberships outside `keepOrgUids`
   */
  private async upsertMemberships(
    memberships: PersonMembership[],
    personId: number,
    replace?: { keepOrgUids: string[] },
  ): Promise<void> {
    const organizationUnitDAO = new OrganizationUnitDAO()
    const resolved: { unitId: number; membership: PersonMembership }[] = []
    for (const membership of memberships) {
      const dbOrganizationUnit =
        await organizationUnitDAO.getOrganizationUnitByUid(
          membership.organizationUnit.uid,
        )
      if (!dbOrganizationUnit) {
        console.error(
          `Organization unit not found for UID: ${membership.organizationUnit.uid}`,
        )
        continue
      }
      resolved.push({ unitId: dbOrganizationUnit.id, membership })
    }

    const write = async (tx: Prisma.TransactionClient) => {
      if (replace) {
        await tx.membership.deleteMany({
          where: {
            personId,
            organizationUnit: { uid: { notIn: replace.keepOrgUids } },
          },
        })
      }
      for (const { unitId, membership } of resolved) {
        await tx.membership.upsert({
          where: {
            personId_organizationUnitId: {
              personId,
              organizationUnitId: unitId,
            },
          },
          update: {
            startDate: membership.startDate,
            endDate: membership.endDate,
            positionCode: membership.positionCode,
          },
          create: {
            personId,
            organizationUnitId: unitId,
            startDate: membership.startDate,
            endDate: membership.endDate,
            positionCode: membership.positionCode,
          },
        })
      }
    }

    if (replace) {
      await this.prismaClient.$transaction(write)
    } else {
      await write(this.prismaClient)
    }
  }

  /**
   * Upsert employments for a given person.
   *
   * With `replace`, employments whose organization unit uid is not in
   * `keepOrgUids` are deleted first, in the same transaction as the upserts
   * (see {@link upsertMemberships} for the reasoning).
   * @param employments - List of employments to upsert
   * @param personId - The ID of the person in the database
   * @param replace - When set, delete employments outside `keepOrgUids`
   */
  private async upsertEmployments(
    employments: PersonEmployment[],
    personId: number,
    replace?: { keepOrgUids: string[] },
  ): Promise<void> {
    const organizationUnitDAO = new OrganizationUnitDAO()
    const resolved: { unitId: number; employment: PersonEmployment }[] = []
    for (const employment of employments) {
      const dbOrganizationUnit =
        await organizationUnitDAO.getOrganizationUnitByUid(
          employment.organizationUnit.uid,
        )
      if (!dbOrganizationUnit) {
        console.error(
          `Organization unit not found for UID: ${employment.organizationUnit.uid}`,
        )
        continue
      }
      resolved.push({ unitId: dbOrganizationUnit.id, employment })
    }

    const write = async (tx: Prisma.TransactionClient) => {
      if (replace) {
        await tx.employment.deleteMany({
          where: {
            personId,
            organizationUnit: { uid: { notIn: replace.keepOrgUids } },
          },
        })
      }
      for (const { unitId, employment } of resolved) {
        await tx.employment.upsert({
          where: {
            personId_organizationUnitId: {
              personId,
              organizationUnitId: unitId,
            },
          },
          update: {
            startDate: employment.startDate,
            endDate: employment.endDate,
            positionCode: employment.positionCode,
          },
          create: {
            personId,
            organizationUnitId: unitId,
            startDate: employment.startDate,
            endDate: employment.endDate,
            positionCode: employment.positionCode,
          },
        })
      }
    }

    if (replace) {
      await this.prismaClient.$transaction(write)
    } else {
      await write(this.prismaClient)
    }
  }

  /**
   * Upsert the source-person records of a given person.
   *
   * With `replace`, records absent from the incoming data are unlinked
   * (`personId: null`) after the upserts. They are disconnected rather than
   * deleted, because a source person is also referenced by the contributions
   * of document records. The unlink runs last so a crash can only leave stale
   * links behind (repaired by the next message), never sever fresh ones.
   * @param records - List of source persons to upsert
   * @param personId - The ID of the person in the database
   * @param replace - When true, unlink records absent from the incoming data
   */
  private async upsertRecords(
    records: SourcePerson[],
    personId: number,
    replace = false,
  ): Promise<void> {
    const sourcePersonDAO = new SourcePersonDAO()
    for (const record of records) {
      await sourcePersonDAO.createOrUpdateSourcePerson(record, personId)
    }

    if (replace) {
      await this.prismaClient.sourcePerson.updateMany({
        where: {
          personId,
          uid: { notIn: records.map((record) => record.uid) },
        },
        data: { personId: null },
      })
    }
  }

  /**
   * Checks if a given slug already exists in the database.
   * If updating, it ensures the conflict is not caused by the same person.
   */
  private async slugExists(
    slug: string,
    excludeUid?: string,
  ): Promise<boolean> {
    const existingPerson = await this.prismaClient.person.findFirst({
      where: {
        slug,
        uid: excludeUid ? { not: excludeUid } : undefined, // Avoid self-collision on updates
      },
    })

    return existingPerson !== null
  }

  /**
   * Handle potential conflicts with existing PersonIdentifiers
   * @param identifiers - The list of identifiers to check
   * @param currentPersonId - The ID of the current person
   */
  private async handleIdentifierConflicts(
    identifiers: PersonIdentifier[],
    currentPersonId: number,
  ): Promise<void> {
    const conflictingIdentifiers =
      await this.prismaClient.personIdentifier.findMany({
        where: {
          OR: identifiers.map((identifier) => ({
            type: PersonIdentifier.typeFromString(identifier.type),
            value: identifier.value,
            personId: { not: currentPersonId },
          })),
        },
      })

    if (conflictingIdentifiers.length > 0) {
      throw new Error(
        `Conflicting identifiers found: ${conflictingIdentifiers
          .map((id) => `${id.type}:${id.value}`)
          .join(', ')}`,
      )
    }
  }

  /**
   * Upsert PersonIdentifiers for a given person. Existing rows are updated in
   * place rather than recreated, so their id and their OrcidIdentifier
   * extension (OAuth tokens) survive.
   * @param identifiers - The list of identifiers to upsert
   * @param personId - The ID of the person
   * @param options - `prune: true` when `identifiers` is the person's complete
   *   set (person AMQP message): identifiers absent from it are deleted, except
   *   local-only ones. In both modes, hal_login is deleted when no stored
   *   idHAL form is kept or one changes value.
   * @param retries - The number of retries (to handle conflicts on upsert)
   */
  private async upsertIdentifiers(
    identifiers: PersonIdentifier[],
    personId: number,
    { prune }: { prune: boolean },
    retries = 0,
  ): Promise<void> {
    try {
      await this.prismaClient.$transaction(async (tx) => {
        const existing = await tx.personIdentifier.findMany({
          where: { personId },
          select: { id: true, type: true, value: true, validated: true },
        })
        const existingByType = new Map(existing.map((row) => [row.type, row]))

        for (const identifier of identifiers) {
          const current = existingByType.get(identifier.type)
          if (!current) {
            await tx.personIdentifier.create({
              data: {
                personId,
                type: identifier.type,
                value: identifier.value,
                validated: identifier.validated,
              },
            })
          } else if (current.value !== identifier.value) {
            // OAuth tokens belong to the previous ORCID iD
            await tx.orcidIdentifier.deleteMany({ where: { id: current.id } })
            await tx.personIdentifier.update({
              where: { id: current.id },
              data: {
                value: identifier.value,
                validated: identifier.validated,
              },
            })
          } else if (identifier.validated !== current.validated) {
            // The graph is the source of truth for the validation state
            await tx.personIdentifier.update({
              where: { id: current.id },
              data: { validated: identifier.validated },
            })
          }
        }

        // hal_login only authenticates the idHAL(s) it was obtained with
        const idHalsBefore = new Map(
          existing
            .filter((row) => isIdHalType(row.type))
            .map((row) => [row.type, row.value]),
        )
        const idHalsAfter = new Map(prune ? [] : idHalsBefore)
        for (const identifier of identifiers) {
          if (isIdHalType(identifier.type)) {
            idHalsAfter.set(identifier.type, identifier.value)
          }
        }
        // The authentication holds while one stored form is kept and no form
        // changes value. Adding or dropping the other form keeps it: the graph
        // applies the two forms of an account one message at a time.
        const idHalsBeforeList = [...idHalsBefore]
        const authenticationHolds =
          idHalsBeforeList.some(
            ([type, value]) => idHalsAfter.get(type) === value,
          ) &&
          idHalsBeforeList.every(
            ([type, value]) =>
              !idHalsAfter.has(type) || idHalsAfter.get(type) === value,
          )
        if (
          existingByType.has(PersonIdentifierType.hal_login) &&
          !authenticationHolds
        ) {
          await tx.personIdentifier.deleteMany({
            where: { personId, type: PersonIdentifierType.hal_login },
          })
        }

        if (!prune) return

        const incomingTypes = identifiers.map((identifier) => identifier.type)
        await tx.personIdentifier.deleteMany({
          where: {
            personId,
            type: { notIn: [...incomingTypes, ...LOCAL_ONLY_IDENTIFIER_TYPES] },
          },
        })
      })
    } catch (error: unknown) {
      console.error('Error during identifier upsert:', error as Error)
      if (isUniqueConstraintError(error)) {
        if (retries < 3) {
          console.warn('Retrying identifier upsert...')
          await this.upsertIdentifiers(
            identifiers,
            personId,
            { prune },
            retries + 1,
          )
        } else {
          console.error('Failed to upsert identifiers after 3 retries')
        }
      } else {
        throw new Error(
          `Failed to upsert identifiers: ${(error as Error).message}`,
        )
      }
    }
  }

  /**
   * Upsert the idHAL(s) of a HAL account and their companion hal_login in a
   * single transaction, so an interruption can never leave one without the
   * other. Throws {@link IdentifierConflictError} when another person holds
   * one of the values.
   * @param personUid - The UID of the person
   * @param idHals - The idHAL forms of the account (idhals and/or idhali)
   * @param halLogin - The HAL account login
   * @param actions - Outgoing actions recorded in the same transaction
   */
  public async upsertHalIdentifiers(
    personUid: string,
    idHals: PersonIdentifier[],
    halLogin: string,
    actions: CreateActionParams[] = [],
  ): Promise<void> {
    if (idHals.length === 0) {
      throw new Error('upsertHalIdentifiers called without any idHAL')
    }
    const nonIdHal = idHals.find(
      (idHal) => !isIdHalType(idHal.type as PersonIdentifierType),
    )
    if (nonIdHal) {
      throw new Error(
        `upsertHalIdentifiers called with non-idHAL identifier type: ${nonIdHal.type}`,
      )
    }

    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }
    const personId = person.id

    const identifiers = [
      new PersonIdentifier(PersonIdentifierType.hal_login, halLogin),
      ...idHals,
    ]
    try {
      await this.prismaClient.$transaction(async (tx) => {
        for (const identifier of identifiers) {
          await tx.personIdentifier.upsert({
            where: { personId_type: { personId, type: identifier.type } },
            update: { value: identifier.value },
            create: {
              personId,
              type: identifier.type,
              value: identifier.value,
            },
          })
        }
        await recordActions(tx, actions)
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new IdentifierConflictError(identifierConflictReason(error))
      }
      throw new Error(
        `Failed to upsert HAL identifiers: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Create identifier rows for a person, all or none. Unlike
   * {@link upsertIdentifier} this never overwrites an existing value: identifier
   * changes are handled as remove-then-add. Throws {@link IdentifierConflictError}
   * when a row of one of the types already exists for the person, or a value is
   * already used elsewhere. The actions are recorded in the same transaction.
   */
  public async createIdentifiers(
    identifiers: PersonIdentifier[],
    personUid: string,
    actions: CreateActionParams[] = [],
  ): Promise<void> {
    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }

    try {
      await this.prismaClient.$transaction(async (tx) => {
        await tx.personIdentifier.createMany({
          data: identifiers.map((identifier) => ({
            personId: person.id,
            type: identifier.type as PersonIdentifierType,
            value: identifier.value,
            validated: identifier.validated,
          })),
        })
        await recordActions(tx, actions)
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new IdentifierConflictError(identifierConflictReason(error))
      }
      throw new Error(
        `Failed to create identifiers: ${(error as Error).message}`,
      )
    }
  }

  /**
   * True when a person other than `personUid` holds one of the given
   * identifiers (same type and value).
   */
  public async isAnyIdentifierHeldByAnotherPerson(
    personUid: string,
    identifiers: PersonIdentifier[],
  ): Promise<boolean> {
    if (identifiers.length === 0) return false

    const row = await this.prismaClient.personIdentifier.findFirst({
      where: {
        OR: identifiers.map((identifier) => ({
          type: identifier.type as PersonIdentifierType,
          value: identifier.value,
        })),
        person: { uid: { not: personUid } },
      },
      select: { id: true },
    })
    return row !== null
  }

  /**
   * The person's identifiers of the given types, with their validated flag.
   */
  public async findIdentifiers(
    personUid: string,
    types: PersonIdentifierType[],
  ): Promise<PersonIdentifier[]> {
    const rows = await this.prismaClient.personIdentifier.findMany({
      where: { person: { uid: personUid }, type: { in: types } },
      select: { type: true, value: true, validated: true },
      orderBy: { type: 'asc' },
    })
    return rows.map(
      (row) => new PersonIdentifier(row.type, row.value, row.validated),
    )
  }

  /**
   * Returns the stored value of a person's identifier of the given type, or
   * null if the person has none. Used by the authentication consistency check
   * and to carry the value on REMOVE messages.
   */
  public async findIdentifierValue(
    personUid: string,
    type: PersonIdentifierType,
  ): Promise<string | null> {
    const row = await this.prismaClient.personIdentifier.findFirst({
      where: { person: { uid: personUid }, type },
      select: { value: true },
    })
    return row?.value ?? null
  }

  /**
   * Mark a person's identifiers of the given types as validated. The actions
   * are recorded in the same transaction so a flag is never set without its
   * outgoing message.
   * @returns whether an identifier row was updated
   */
  public async markIdentifiersValidated(
    personUid: string,
    types: PersonIdentifierType[],
    actions: CreateActionParams[] = [],
  ): Promise<boolean> {
    return this.prismaClient.$transaction(async (tx) => {
      const { count } = await tx.personIdentifier.updateMany({
        where: { person: { uid: personUid }, type: { in: types } },
        data: { validated: true },
      })
      await recordActions(tx, actions)
      return count > 0
    })
  }

  /**
   * UIDs of internal persons holding at least one identifier of the given types.
   */
  public async fetchInternalPersonUidsWithIdentifierTypes(
    types: PersonIdentifierType[],
  ): Promise<string[]> {
    const people = await this.prismaClient.person.findMany({
      where: {
        external: false,
        identifiers: { some: { type: { in: types } } },
      },
      select: { uid: true },
      orderBy: { id: 'asc' },
    })
    return people.map((person) => person.uid)
  }

  /**
   * Align the `validated` flag of a person's identifiers with the given ones,
   * matched on type and value. Values are never changed.
   * @returns the number of identifier rows updated
   */
  public async syncIdentifiersValidation(
    personUid: string,
    identifiers: PersonIdentifier[],
  ): Promise<number> {
    let updated = 0
    for (const identifier of identifiers) {
      const { count } = await this.prismaClient.personIdentifier.updateMany({
        where: {
          person: { uid: personUid },
          type: identifier.type,
          value: identifier.value,
          validated: !identifier.validated,
        },
        data: { validated: identifier.validated },
      })
      updated += count
    }
    return updated
  }

  /**
   * Persist an authenticated ORCID in a single transaction: the identifier row,
   * its encrypted OAuth extension and the outgoing actions. Throws
   * {@link IdentifierConflictError} when another person holds the ORCID.
   */
  public async upsertAuthenticatedOrcidIdentifier(
    personUid: string,
    identifier: ORCIDIdentifier,
    actions: CreateActionParams[] = [],
  ): Promise<void> {
    const oauth = identifier.oauth
    if (!oauth) {
      throw new Error(
        `Missing OAuth data for ORCID identifier (value=${identifier.value})`,
      )
    }
    // Minimum fields for persistence (the OAuth callback always provides them)
    const { accessToken, refreshToken, scope } = oauth
    if (!accessToken || !refreshToken || !scope) {
      throw new Error(
        `Missing accessToken/refreshToken for ORCID identifier (value=${identifier.value})`,
      )
    }

    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }

    try {
      await this.prismaClient.$transaction(async (tx) => {
        const row = await tx.personIdentifier.upsert({
          where: {
            personId_type: {
              personId: person.id,
              type: PersonIdentifierType.orcid,
            },
          },
          update: { value: identifier.value },
          create: {
            personId: person.id,
            type: PersonIdentifierType.orcid,
            value: identifier.value,
          },
        })

        // The tokens are bound (AAD) to the identifier row created just above
        const keyring = loadKeyringFromEnv()
        const aad = PersonDAO.getORCIDIdentifierAad(row.id)
        const data = {
          id: row.id,
          accessToken: encryptString(accessToken, keyring, { aad }),
          refreshToken: encryptString(refreshToken, keyring, { aad }),
          scope: scope.join(' '),
          tokenType: oauth.tokenType,
          obtainedAt: oauth.obtainedAt,
          expiresAt: oauth.expiresAt,
        }
        await tx.orcidIdentifier.upsert({
          where: { id: row.id },
          create: data,
          update: data,
        })

        await recordActions(tx, actions)
      })
    } catch (error) {
      if (
        isUniqueConstraintError(error) &&
        identifierConflictReason(error) === 'used_by_another_person'
      ) {
        throw new IdentifierConflictError('used_by_another_person')
      }
      throw error
    }
  }

  public static getORCIDIdentifierAad(personIdentifierId: number): string {
    return `${PersonDAO.ORCID_IDENTIFIER_AAD_PREFIX}${personIdentifierId}`
  }

  public async getDecryptedOrcidTokens(
    personIdentifierId: number,
  ): Promise<OrcidOAuthData | null> {
    const row = await this.prismaClient.orcidIdentifier.findUnique({
      where: { id: personIdentifierId },
      select: {
        accessToken: true,
        refreshToken: true,
        scope: true,
        tokenType: true,
        obtainedAt: true,
        expiresAt: true,
      },
    })

    if (!row) return null

    const keyring = loadKeyringFromEnv()
    const aad = `orcidIdentifier:id=${personIdentifierId}`

    return {
      accessToken: row.accessToken
        ? decryptString(row.accessToken, keyring, { aad })
        : null,
      refreshToken: row.refreshToken
        ? decryptString(row.refreshToken, keyring, { aad })
        : null,
      scope: ORCIDIdentifier.parseOrcidScope(row.scope),
      tokenType: row.tokenType,
      obtainedAt: row.obtainedAt,
      expiresAt: row.expiresAt,
    }
  }

  /**
   * Sidebar people search. A blank query lists everyone by last name;
   * otherwise every query word must match the normalized name (substring or
   * pg_trgm typo tolerance) and results are ranked by relevance.
   */
  public fetchPeople = async (
    searchTerm: string,
    page: number,
    includeExternal: boolean,
    itemsPerPage: number,
  ): Promise<{
    people: Person[]
    total: number
    hasMore: boolean
  }> => {
    const skip = (page - 1) * itemsPerPage
    const tokens = tokenizeSearchQuery(searchTerm)

    if (tokens.length === 0) {
      const where: Prisma.PersonWhereInput = includeExternal
        ? {}
        : { external: false }
      const [data, total] = await Promise.all([
        this.prismaClient.person.findMany({
          where,
          skip,
          take: itemsPerPage,
          include: peopleSearchInclude,
          orderBy: { lastName: 'asc' },
        }),
        this.prismaClient.person.count({ where }),
      ])
      return {
        people: data.map((person) => Person.fromDbPerson(person)),
        total,
        hasMore: total > page * itemsPerPage,
      }
    }

    const column = Prisma.sql`p."normalizedName"`
    const match = buildTokenMatch(column, tokens)
    const where = Prisma.sql`(${includeExternal} OR p.external = false) AND ${match.where}`
    const [rows, [{ total }]] = await withWordSimilarityThreshold(
      this.prismaClient,
      [
        this.prismaClient.$queryRaw<{ id: number }[]>`
          SELECT p.id FROM "Person" p
          WHERE ${where}
          ORDER BY ${match.score} DESC,
            similarity(${column}, ${tokens.join(' ')}) DESC,
            p."lastName" ASC NULLS LAST,
            p.id ASC
          LIMIT ${itemsPerPage} OFFSET ${skip}`,
        this.prismaClient.$queryRaw<{ total: number }[]>`
          SELECT count(*)::int AS total FROM "Person" p WHERE ${where}`,
      ],
    )

    const ids = rows.map((row) => row.id)
    const data = await this.prismaClient.person.findMany({
      where: { id: { in: ids } },
      include: peopleSearchInclude,
    })
    const rankById = new Map(ids.map((id, rank) => [id, rank]))
    data.sort((a, b) => rankById.get(a.id)! - rankById.get(b.id)!)

    return {
      people: data.map((person) => Person.fromDbPerson(person)),
      total,
      hasMore: total > page * itemsPerPage,
    }
  }

  public async fetchPersonBySlug(slug: string): Promise<Person | null> {
    try {
      const dbPerson = await this.prismaClient.person.findUnique({
        where: { slug },
        include: personDetailInclude,
      })

      if (!dbPerson) {
        return null
      }

      return Person.fromDbPerson(dbPerson)
    } catch (error) {
      console.error(`Error fetching person with slug ${slug}:`, error)
      throw new Error(`Failed to fetch person with slug ${slug}`)
    }
  }

  /**
   * Membership condition defining an organization perspective's perimeter:
   * - research_unit / team: direct members of the organization;
   * - institution: members of the research units that are member_of the
   *   institution (any supervision position, one hop) — no direct
   *   institution memberships, no employments until they exist;
   * - other_structure (institution & unit subdivisions): direct members,
   *   plus members of the units that are member_of or part_of it (one hop).
   */
  private organizationPerimeterWhereClause(
    organizationUid: string,
    group: OrganizationGroup,
  ): Prisma.PersonWhereInput {
    const directMembership: Prisma.PersonWhereInput = {
      memberships: {
        some: { organizationUnit: { uid: organizationUid } },
      },
    }
    const childMembership = (
      kinds: OrganizationRelationKind[],
      childCategories?: OrganizationCategory[],
    ): Prisma.PersonWhereInput => ({
      memberships: {
        some: {
          organizationUnit: {
            ...(childCategories ? { category: { in: childCategories } } : {}),
            parents: {
              some: {
                kind: { in: kinds },
                parent: { uid: organizationUid },
              },
            },
          },
        },
      },
    })

    switch (group) {
      case 'institution':
        return childMembership(
          [OrganizationRelationKind.member_of],
          [OrganizationCategory.research_unit],
        )
      case 'other_structure':
        return {
          OR: [
            directMembership,
            childMembership([
              OrganizationRelationKind.member_of,
              OrganizationRelationKind.part_of,
            ]),
          ],
        }
      case 'research_unit':
      case 'team':
        return directMembership
    }
  }

  /**
   * Fetch the people whose documents make up an organization perspective
   * (see organizationPerimeterWhereClause for the per-group rules).
   */
  fetchPersonUidsByOrganizationPerimeter = async (
    organizationUid: string,
    group: OrganizationGroup,
  ): Promise<string[]> => {
    const people = await this.prismaClient.person.findMany({
      where: this.organizationPerimeterWhereClause(organizationUid, group),
      select: { uid: true },
    })
    return people.map((person) => person.uid)
  }

  /**
   * People directly attached to a structure: Membership rows for research
   * structures, Employment rows for institutions. Returns the link dates and
   * the person's identifiers; KPI fields are left for the service to fill.
   */
  public async fetchStructureMembers(
    organizationUid: string,
    kind: 'membership' | 'employment',
  ): Promise<StructureMember[]> {
    const where = { organizationUnit: { uid: organizationUid } }
    const select = {
      startDate: true,
      endDate: true,
      positionCode: true,
      person: {
        select: {
          id: true,
          uid: true,
          slug: true,
          displayName: true,
          firstName: true,
          lastName: true,
          identifiers: {
            select: {
              type: true,
              value: true,
              validated: true,
              orcidIdentifier: { select: { id: true } },
            },
          },
        },
      },
    } as const
    const rows =
      kind === 'employment'
        ? await this.prismaClient.employment.findMany({ where, select })
        : await this.prismaClient.membership.findMany({ where, select })
    return rows.map(StructureMember.fromDb)
  }

  /**
   * Memberships of a set of people, with each organization's direct parents,
   * grouped by person id. Enough to compute their authorization perimeters.
   */
  public async fetchMembershipsByPersonIds(
    personIds: number[],
  ): Promise<Map<number, PersonMembership[]>> {
    const byPerson = new Map<number, PersonMembership[]>()
    if (personIds.length === 0) {
      return byPerson
    }
    const rows = await this.prismaClient.membership.findMany({
      where: { personId: { in: personIds } },
      include: {
        organizationUnit: {
          include: {
            ...organizationUnitInclude,
            ...organizationUnitParentsInclude,
          },
        },
      },
    })
    for (const row of rows) {
      const memberships = byPerson.get(row.personId) ?? []
      memberships.push(PersonMembership.fromDbPersonMembership(row))
      byPerson.set(row.personId, memberships)
    }
    return byPerson
  }

  /**
   * First non-null employment position code per person. Most people have a
   * single employment; when there are several, the first row wins.
   */
  public async fetchFirstEmploymentPositions(
    personIds: number[],
  ): Promise<Map<number, string>> {
    if (personIds.length === 0) {
      return new Map()
    }
    const rows = await this.prismaClient.employment.findMany({
      where: { personId: { in: personIds }, positionCode: { not: null } },
      select: { personId: true, positionCode: true },
      orderBy: { id: 'asc' },
    })
    const byPerson = new Map<number, string>()
    for (const row of rows) {
      if (!byPerson.has(row.personId)) {
        byPerson.set(row.personId, row.positionCode!)
      }
    }
    return byPerson
  }

  public async fetchPersonByUid(uid: string): Promise<Person | null> {
    try {
      const dbPerson = await this.prismaClient.person.findUnique({
        where: { uid },
        include: personDetailInclude,
      })

      if (!dbPerson) {
        return null
      }

      return Person.fromDbPerson(dbPerson)
    } catch (error) {
      console.error(`Error fetching person with uid ${uid}:`, error)
      throw new Error(`Failed to fetch person with uid ${uid}`)
    }
  }

  /**
   * Delete a person's identifier and record the actions in the same
   * transaction.
   */
  public async deleteIdentifier(
    personUid: string,
    type: PersonIdentifierType,
    actions: CreateActionParams[] = [],
  ): Promise<void> {
    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }
    // Removing an idHAL removes both its forms (they are one HAL account) and
    // its companion hal_login: hal_login is not a user-managed identifier, it
    // only marks the idHAL as authenticated.
    const types: PersonIdentifierType[] = isIdHalType(type)
      ? [...ID_HAL_TYPES, PersonIdentifierType.hal_login]
      : [type]
    await this.prismaClient.$transaction(async (tx) => {
      await tx.personIdentifier.deleteMany({
        where: { personId: person.id, type: { in: types } },
      })
      await recordActions(tx, actions)
    })
  }

  public async fetchPersonByIdentifier(
    identifier: PersonIdentifier,
  ): Promise<Person | null> {
    try {
      const dbPerson = await this.prismaClient.person.findFirst({
        where: {
          identifiers: {
            some: {
              type: identifier.type as PersonIdentifierType,
              value: identifier.value,
            },
          },
        },
        include: {
          memberships: {
            include: {
              organizationUnit: {
                include: {
                  labels: true,
                  parents: { include: { parent: true } },
                  identifiers: true,
                  descriptions: true,
                },
              },
            },
          },
          employments: {
            include: {
              organizationUnit: {
                include: {
                  labels: true,
                  parents: { include: { parent: true } },
                  identifiers: true,
                  descriptions: true,
                },
              },
            },
          },
          identifiers: true,
          records: {
            include: {
              identifiers: true,
            },
          },
        },
      })

      if (!dbPerson) {
        return null
      }

      return Person.fromDbPerson(dbPerson)
    } catch (error) {
      console.error(
        `Error fetching person with identifier ${identifier.type}:${identifier.value}:`,
        error,
      )
      throw new Error(
        `Failed to fetch person with identifier ${identifier.type}:${identifier.value}`,
      )
    }
  }

  /**
   * Fill `normalizedName` for people written without it. Idempotent.
   * Returns the updated row count.
   */
  async backfillNormalizedSearchColumns(batchSize?: number): Promise<number> {
    return backfillNormalizedColumn(
      this.prismaClient,
      async (take) =>
        (
          await this.prismaClient.person.findMany({
            where: { normalizedName: null },
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
            take,
          })
        ).map((row) => ({
          id: row.id,
          source:
            row.displayName?.trim() ||
            `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
        })),
      (id, normalized) =>
        this.prismaClient.person.update({
          where: { id },
          data: { normalizedName: normalized },
        }),
      batchSize,
    )
  }
}
