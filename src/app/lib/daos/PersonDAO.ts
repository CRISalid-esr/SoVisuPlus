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

interface FetchPeopleFromDbDBParams {
  searchTerm: string
  page: number
  includeExternal: boolean
  itemsPerPage: number
}

/** PersonDAO: Handles operations related to Person and PersonIdentifiers */
export class PersonDAO extends AbstractDAO {
  /**
   * Create or update a Person record in the database
   * @param person - The Person object to upsert
   * @returns The created or updated Person record
   */
  public async createOrUpdatePerson(person: Person): Promise<DbPerson> {
    try {
      const baseSlug = slugify(`${person.firstName}-${person.lastName}`, {
        lower: true,
        strict: true,
      })

      let uniqueSlug = baseSlug
      let counter = 1

      // Ensure uniqueness of the slug
      while (await this.slugExists(uniqueSlug, person.uid)) {
        uniqueSlug = `${baseSlug}-${counter}`
        counter++
      }

      const dbPerson: DbPerson = await this.prismaClient.person.upsert({
        where: { uid: person.uid },
        update: {
          email: person.email,
          displayName: person.displayName,
          firstName: person.firstName,
          lastName: person.lastName,
          external: person.external,
          slug: uniqueSlug,
        },
        create: {
          uid: person.uid,
          email: person.email,
          displayName: person.displayName,
          firstName: person.firstName,
          lastName: person.lastName,
          external: person.external,
          slug: uniqueSlug,
        },
      })

      await this.handleIdentifierConflicts(person.getIdentifiers(), dbPerson.id)
      await this.upsertIdentifiers(person.getIdentifiers(), dbPerson.id)

      return dbPerson
    } catch (error) {
      console.error('Error during person upsert:', error)
      throw new Error(
        `Failed to upsert person: ${(error as unknown as Error).message}`,
      )
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

  public fetchPeopleFromDb = async ({
    searchTerm,
    page,
    includeExternal,
    itemsPerPage,
  }: FetchPeopleFromDbDBParams): Promise<{
    people: Person[]
    total: number
    hasMore: boolean
  }> => {
    const perspectiveRolesFilter =
      process.env.PERSPECTIVES_ROLES_FILTER?.split(',') || []
    const searchTerms = searchTerm.trim().split(/\s+/)
    const searchCriteria = searchTerms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ],
    }))

    let whereClause: Prisma.PersonWhereInput = {
      AND: searchCriteria,
    }

    if (perspectiveRolesFilter.length > 0) {
      whereClause = {
        ...whereClause,
        contributions: {
          some: {
            roles: {
              hasSome: perspectiveRolesFilter,
            },
          },
        },
      }
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
}
