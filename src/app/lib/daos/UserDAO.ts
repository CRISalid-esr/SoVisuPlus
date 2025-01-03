import {
  AgentIdentifierType as DbAgentIdentifierType,
  Person as DbPerson,
  User as DbUser,
} from '@prisma/client'
import { Person } from '@/types/Person'
import { AgentIdentifier } from '@/types/AgentIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'

export class UserDAO extends AbstractDAO {
  /**
   * Create or update a User record in the database
   * @param person - The Person object to upsert
   * @returns The created or updated User record
   */
  public async createOrUpdateUserFor(person: Person): Promise<DbUser> {
    try {
      console.log('Prisma Client Models:', Object.keys(this.prismaClient))
      const dbPerson: DbPerson = await this.prismaClient.person.upsert({
        where: { uid: person.uid },
        update: {
          email: person.email || undefined,
          firstName: person.firstName,
          lastName: person.lastName,
        },
        create: {
          uid: person.uid,
          email: person.email || '',
          firstName: person.firstName,
          lastName: person.lastName,
        },
      })

      // Handle AgentIdentifier separately
      await this.prismaClient.agentIdentifier.deleteMany({
        where: { personId: dbPerson.id },
      })

      await this.prismaClient.agentIdentifier.createMany({
        data: person.identifiers.map((identifier) => ({
          personId: dbPerson.id,
          type: identifier.type.toUpperCase() as DbAgentIdentifierType,
          value: identifier.value,
        })),
      })

      return await this.prismaClient.user.upsert({
        where: { personId: dbPerson.id },
        update: {},
        create: { personId: dbPerson.id },
      })
    } catch (error) {
      console.error('Error during user upsert:', error as Error)
      throw new Error(`Failed to upsert user: ${(error as Error).message}`)
    }
  }

  /**
   * Fetch a User by an AgentIdentifier.
   * @param identifier - The AgentIdentifier to search for.
   * @returns The User record if found, null otherwise.
   */
  public async getUserByIdentifier(
    identifier: AgentIdentifier,
  ): Promise<DbUser | null> {
    try {
      return await this.prismaClient.user.findFirst({
        where: {
          person: {
            identifiers: {
              some: {
                type: identifier.type.toUpperCase() as DbAgentIdentifierType,
                value: identifier.value,
              },
            },
          },
        },
        include: { person: true }, // Include associated Person if needed
      })
    } catch (error) {
      console.error('Error fetching user by identifier:', error as Error)
      throw new Error(
        `Failed to fetch user by identifier: ${(error as Error).message}`,
      )
    }
  }
}
