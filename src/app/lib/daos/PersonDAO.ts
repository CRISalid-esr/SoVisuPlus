import {
  PersonIdentifierType as DbPersonIdentifierType,
  Person as DbPerson,
} from '@prisma/client'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'

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
          firstName: person.firstName,
          lastName: person.lastName,
        },
        create: {
          uid: person.uid,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
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
  ): Promise<void> {
    // Remove old identifiers
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
  }
}
