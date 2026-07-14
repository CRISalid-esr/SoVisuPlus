import slugify from 'slugify'
import {
  OrganizationCategory,
  OrganizationRelationKind,
  Person as DbPerson,
  PersonIdentifier as DbPersonIdentifier,
  Prisma,
} from '@prisma/client'
import { Person } from '@/types/Person'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PersonMembership } from '@/types/PersonMembership'
import { PersonEmployment } from '@/types/PersonEmployment'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationGroup } from '@/types/IAgent'
import { SourcePersonDAO } from '@/lib/daos/SourcePersonDAO'
import { SourcePerson } from '@/types/SourcePerson'
import removeAccents from 'remove-accents'
import { ORCIDIdentifier, OrcidOAuthData } from '@/types/OrcidIdentifier'
import { loadKeyringFromEnv } from '@/utils/crypto/keyring'
import { decryptString, encryptString } from '@/utils/crypto/fieldEncryption'
/**
 * Thrown when an identifier cannot be created because one already exists —
 * either the person already has an identifier of that type, or the value is
 * already used by another person (`@@unique([type, value])`). Callers translate
 * this into a 409 (remove-before-add).
 */
export class IdentifierConflictError extends Error {
  constructor(message = 'Identifier already exists') {
    super(message)
    this.name = 'IdentifierConflictError'
  }
}

/** PersonDAO: Handles operations related to Person and PersonIdentifiers */
export class PersonDAO extends AbstractDAO {
  static ORCID_IDENTIFIER_AAD_PREFIX = 'orcidIdentifier:id='

  /**
   * Create or update a Person record in the database
   * @param person - The Person object to upsert
   * @returns The created or updated Person record
   */
  public async createOrUpdatePerson(person: Person): Promise<DbPerson> {
    try {
      const slugPrefix = 'person:'
      // baseSlug could be null for people with only a display name
      let baseSlug: string | null = slugify(
        `${person.firstName}-${person.lastName}`,
        {
          lower: true,
          strict: true,
        },
      )
      // if baseSlug is not null, add the prefix
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

          await this.upsertIdentifiers(person.getIdentifiers(), dbPerson.id)

          await this.upsertMemberships(person.memberships, dbPerson.id)

          await this.upsertEmployments(person.employments, dbPerson.id)

          await this.upsertRecords(person.records, dbPerson.id)

          // The upsert result carries every scalar column callers read (id, external,
          // uid, …); the person's relations are written above but never consumed off the
          // return value, so there is no need to re-fetch them here.
          return dbPerson
        } catch (error) {
          if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002' && // Unique constraint violation
            baseSlug
          ) {
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
   * Upsert memberships for a given person
   * @param memberships - List of memberships to upsert
   * @param personId - The ID of the person in the database
   */
  private async upsertMemberships(
    memberships: PersonMembership[],
    personId: number,
  ): Promise<void> {
    const organizationUnitDAO = new OrganizationUnitDAO()
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
      await this.prismaClient.membership.upsert({
        where: {
          personId_organizationUnitId: {
            personId,
            organizationUnitId: dbOrganizationUnit.id,
          },
        },
        update: {
          startDate: membership.startDate,
          endDate: membership.endDate,
          positionCode: membership.positionCode,
        },
        create: {
          personId,
          organizationUnitId: dbOrganizationUnit.id,
          startDate: membership.startDate,
          endDate: membership.endDate,
          positionCode: membership.positionCode,
        },
      })
    }
  }

  /**
   * Upsert employments for a given person
   * @param employments - List of employments to upsert
   * @param personId - The ID of the person in the database
   */
  private async upsertEmployments(
    employments: PersonEmployment[],
    personId: number,
  ): Promise<void> {
    const organizationUnitDAO = new OrganizationUnitDAO()
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
      await this.prismaClient.employment.upsert({
        where: {
          personId_organizationUnitId: {
            personId,
            organizationUnitId: dbOrganizationUnit.id,
          },
        },
        update: {
          startDate: employment.startDate,
          endDate: employment.endDate,
          positionCode: employment.positionCode,
        },
        create: {
          personId,
          organizationUnitId: dbOrganizationUnit.id,
          startDate: employment.startDate,
          endDate: employment.endDate,
          positionCode: employment.positionCode,
        },
      })
    }
  }

  /**
   * Upsert the source-person records of a given person
   * @param records - List of source persons to upsert
   * @param personId - The ID of the person in the database
   */
  private async upsertRecords(
    records: SourcePerson[],
    personId: number,
  ): Promise<void> {
    const sourcePersonDAO = new SourcePersonDAO()
    for (const record of records) {
      await sourcePersonDAO.createOrUpdateSourcePerson(record, personId)
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
   * Upsert PersonIdentifiers for a given person
   * @param identifiers - The list of identifiers to upsert
   * @param personId - The ID of the person
   * @param retries - The number of retries (to handle conflicts on upsert)
   */
  private async upsertIdentifiers(
    identifiers: PersonIdentifier[],
    personId: number,
    retries = 0,
  ): Promise<void> {
    // Remove old identifiers
    try {
      await this.prismaClient.personIdentifier.deleteMany({
        where: { personId },
      })

      // Insert new identifiers

      await this.prismaClient.personIdentifier.createMany({
        data: identifiers.map((identifier) => ({
          personId,
          type: identifier.type as PersonIdentifierType,
          value: identifier.value,
        })),
      })
    } catch (error: unknown) {
      console.error('Error during identifier upsert:', error as Error)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (retries < 3) {
          console.warn('Retrying identifier upsert...')
          await this.upsertIdentifiers(identifiers, personId, retries + 1)
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
   * Upsert a single PersonIdentifier for a given person
   * @param identifier - The identifier to upsert
   * @param personUid - The UID of the person
   * @param retries - The number of retries (to handle conflicts on upsert)
   * @returns The created or updated PersonIdentifier record
   */
  public async upsertIdentifier(
    identifier: PersonIdentifier,
    personUid: string,
    retries = 0,
  ): Promise<DbPersonIdentifier> {
    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })

    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }

    const personId = person.id

    try {
      return await this.prismaClient.personIdentifier.upsert({
        where: {
          personId_type: {
            personId,
            type: identifier.type as PersonIdentifierType,
          },
        },
        update: {
          value: identifier.value,
        },
        create: {
          personId,
          type: identifier.type as PersonIdentifierType,
          value: identifier.value,
        },
      })
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (retries < 3) {
          console.warn('Retrying identifier upsert...')
          // recursive call : return the retry result !
          return this.upsertIdentifier(identifier, personUid, retries + 1)
        }
        throw new Error('Failed to upsert identifier after 3 retries (P2002)')
      }

      throw new Error(
        `Failed to upsert identifier: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Create an identifier row for a person. Unlike {@link upsertIdentifier} this
   * never overwrites an existing value: identifier changes are handled as
   * remove-then-add. Throws {@link IdentifierConflictError} when a row of that
   * type already exists for the person, or the value is already used elsewhere.
   */
  public async createIdentifier(
    identifier: PersonIdentifier,
    personUid: string,
  ): Promise<DbPersonIdentifier> {
    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }

    try {
      return await this.prismaClient.personIdentifier.create({
        data: {
          personId: person.id,
          type: identifier.type as PersonIdentifierType,
          value: identifier.value,
        },
      })
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new IdentifierConflictError()
      }
      throw new Error(
        `Failed to create identifier: ${(error as Error).message}`,
      )
    }
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

  public async upsertOrcidIdentifierExtension(
    personIdentifierId: number,
    identifier: ORCIDIdentifier,
  ): Promise<void> {
    // Redundant check: idetifier type is hard coded in the ORCIDIdentifier class
    if (identifier.type !== PersonIdentifierType.orcid) {
      throw new Error(
        `upsertOrcidIdentifierExtension called with non-ORCID identifier type: ${identifier.type}`,
      )
    }

    // The identifier itself should have been created in the service layer at previous step.
    const base = await this.prismaClient.personIdentifier.findUnique({
      where: { id: personIdentifierId },
      select: { id: true, type: true },
    })
    if (!base) {
      throw new Error(
        `PersonIdentifier with id=${personIdentifierId} not found`,
      )
    }
    if (base.type !== PersonIdentifierType.orcid) {
      throw new Error(
        `PersonIdentifier id=${personIdentifierId} is not ORCID (found type=${base.type})`,
      )
    }

    const oauth = identifier.oauth
    if (!oauth) {
      throw new Error(
        `Missing OAuth data for ORCID identifier (personIdentifierId=${personIdentifierId})`,
      )
    }

    // Require minimum fields for persistence (callback should always provide these)
    if (!oauth.accessToken || !oauth.refreshToken || !oauth.scope) {
      throw new Error(
        `Missing accessToken/refreshToken for ORCID identifier (personIdentifierId=${personIdentifierId})`,
      )
    }

    const keyring = loadKeyringFromEnv()
    // aad is bound to the record being created/updated
    const aad = PersonDAO.getORCIDIdentifierAad(personIdentifierId)

    // Serialize scopes
    const scopeStr = oauth.scope.join(' ')

    const data = {
      id: personIdentifierId,
      accessToken: encryptString(oauth.accessToken, keyring, { aad }),
      refreshToken: encryptString(oauth.refreshToken, keyring, { aad }),
      scope: scopeStr,
      tokenType: oauth.tokenType,
      obtainedAt: oauth.obtainedAt,
      expiresAt: oauth.expiresAt,
    }

    // Note that we could override the tokens with null values on update
    await this.prismaClient.orcidIdentifier.upsert({
      where: { id: personIdentifierId },
      create: data,
      update: data,
    })
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
    const searchTerms = searchTerm.trim().split(/\s+/).map(removeAccents)
    const whereClause: Prisma.PersonWhereInput = {
      AND: searchTerms.map((term) => ({
        normalizedName: {
          contains: term,
          mode: Prisma.QueryMode.insensitive,
        },
      })),
    }

    if (!includeExternal) {
      whereClause.external = false
    }

    const data = await this.prismaClient.person.findMany({
      where: whereClause,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
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
      orderBy: {
        lastName: 'asc',
      },
    })

    const people = data.map((person) => Person.fromDbPerson(person))

    // Fix: Ensure total count query uses the same whereClause
    const total = await this.prismaClient.person.count({ where: whereClause })

    return {
      people,
      total,
      hasMore: total > page * itemsPerPage,
    }
  }

  public async fetchPersonBySlug(slug: string): Promise<Person | null> {
    try {
      const dbPerson = await this.prismaClient.person.findUnique({
        where: { slug },
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
  fetchPeopleByOrganizationPerimeter = async (
    organizationUid: string,
    group: OrganizationGroup,
  ): Promise<Person[]> => {
    const people = await this.prismaClient.person.findMany({
      where: this.organizationPerimeterWhereClause(organizationUid, group),
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

    return people.map((person) => Person.fromDbPerson(person))
  }

  public async fetchPersonByUid(uid: string): Promise<Person | null> {
    try {
      const dbPerson = await this.prismaClient.person.findUnique({
        where: { uid },
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
      console.error(`Error fetching person with uid ${uid}:`, error)
      throw new Error(`Failed to fetch person with uid ${uid}`)
    }
  }

  public async deleteIdentifier(
    personUid: string,
    type: PersonIdentifierType,
  ): Promise<void> {
    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
      select: { id: true },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }
    // Removing an idHAL also removes its companion hal_login: hal_login is not a
    // user-managed identifier, it only marks the idHAL as authenticated.
    const types: PersonIdentifierType[] =
      type === PersonIdentifierType.idhals ||
      type === PersonIdentifierType.idhali
        ? [type, PersonIdentifierType.hal_login]
        : [type]
    await this.prismaClient.personIdentifier.deleteMany({
      where: { personId: person.id, type: { in: types } },
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
}
