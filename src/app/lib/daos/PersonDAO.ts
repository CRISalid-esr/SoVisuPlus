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
      const dbPerson: DbPerson = await this.prismaClient.person.upsert({
        where: { uid: person.uid },
        update: {
          email: person.email,
          displayName: person.displayName,
          firstName: person.firstName,
          lastName: person.lastName,
          external: person.external,
        },
        create: {
          uid: person.uid,
          email: person.email,
          displayName: person.displayName,
          firstName: person.firstName,
          lastName: person.lastName,
          external: person.external,
        },
      })

      await this.handleIdentifierConflicts(person.getIdentifiers(), dbPerson.id)
      await this.upsertIdentifiers(person.getIdentifiers(), dbPerson.id)

      return dbPerson
    } catch (error) {
      console.error('Error during person upsert:', error as Error)
      throw new Error(`Failed to upsert person: ${(error as Error).message}`)
    }
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
    people: DbPerson[]
    total: number 
    hasMore: boolean
  }> => {
    const searchTerms = searchTerm.trim().split(/\s+/)
    const searchCriteria = searchTerms.map((term) => ({
      OR: [
        {
          firstName: {
            contains: term,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          lastName: {
            contains: term,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }))

    const whereClause: Prisma.PersonWhereInput = {
      AND: searchCriteria,
    }

    if (!includeExternal) {
      whereClause.external = false
    }

    const people = await this.prismaClient.person.findMany({
      where: whereClause,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        lastName: 'asc',
      },
    })

    const peopleCount = await this.prismaClient.person.count({
      where: {
        AND: searchCriteria,
      },
    })
    return {
      people,
      total: peopleCount,
      hasMore: peopleCount > page * itemsPerPage,
    }
  }
}
