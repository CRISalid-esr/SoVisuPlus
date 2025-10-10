import slugify from 'slugify'
import {
  Person as DbPerson,
  PersonIdentifierType as DbPersonIdentifierType,
  Prisma,
} from '@prisma/client'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PersonMembership } from '@/types/PersonMembership'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import removeAccents from 'remove-accents'

/** PersonDAO: Handles operations related to Person and PersonIdentifiers */
export class PersonDAO extends AbstractDAO {
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
    const researchStructureDAO = new ResearchStructureDAO()
    for (const membership of memberships) {
      const dbResearchStructure =
        await researchStructureDAO.getResearchStructureByUid(
          membership.researchStructure.uid,
        )
      if (!dbResearchStructure) {
        console.error(
          `Research structure not found for UID: ${membership.researchStructure.uid}`,
        )
        continue
      }
      await this.prismaClient.membership.upsert({
        where: {
          personId_researchStructureId: {
            personId,
            researchStructureId: dbResearchStructure.id,
          },
        },
        update: {
          startDate: membership.startDate,
          endDate: membership.endDate,
          positionCode: membership.positionCode,
        },
        create: {
          personId,
          researchStructureId: dbResearchStructure.id,
          startDate: membership.startDate,
          endDate: membership.endDate,
          positionCode: membership.positionCode,
        },
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
            type: identifier.type.toUpperCase() as DbPersonIdentifierType,
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
          type: identifier.type.toUpperCase() as DbPersonIdentifierType,
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
   * */
  public async upsertIdentifier(
    identifier: PersonIdentifier,
    personUid: string,
    retries = 0,
  ): Promise<void> {
    const person = await this.prismaClient.person.findUnique({
      where: { uid: personUid },
    })
    if (!person) {
      throw new Error(`Person with UID ${personUid} not found`)
    }
    const personId: number = person.id
    try {
      await this.prismaClient.personIdentifier.upsert({
        where: {
          personId_type: {
            personId,
            type: identifier.type.toUpperCase() as DbPersonIdentifierType,
          },
        },
        update: {
          value: identifier.value,
        },
        create: {
          personId,
          type: identifier.type.toUpperCase() as DbPersonIdentifierType,
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
          await this.upsertIdentifier(identifier, personUid, retries + 1)
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
        contributions: {
          select: {
            roles: true,
          },
        },
        memberships: {
          select: {
            startDate: true,
            endDate: true,
            researchStructure: {
              select: {
                uid: true,
                acronym: true,
                slug: true,
              },
            },
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
            select: {
              startDate: true,
              endDate: true,
              researchStructure: {
                select: {
                  uid: true,
                  acronym: true,
                  slug: true,
                },
              },
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

  fetchPeopleByResearchStructureUid = async (
    researchStructureUid: string,
  ): Promise<Person[]> => {
    const people = await this.prismaClient.person.findMany({
      where: {
        memberships: {
          some: {
            researchStructure: {
              uid: researchStructureUid,
            },
          },
        },
      },
      include: {
        memberships: {
          select: {
            startDate: true,
            endDate: true,
            researchStructure: {
              select: {
                uid: true,
                acronym: true,
                slug: true,
              },
            },
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
            select: {
              startDate: true,
              endDate: true,
              researchStructure: {
                select: {
                  uid: true,
                  acronym: true,
                  slug: true,
                },
              },
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

  public async fetchPersonByIdentifier(
    identifier: PersonIdentifier,
  ): Promise<Person | null> {
    try {
      const dbPerson = await this.prismaClient.person.findFirst({
        where: {
          identifiers: {
            some: {
              type: identifier.type.toUpperCase() as DbPersonIdentifierType,
              value: identifier.value,
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
