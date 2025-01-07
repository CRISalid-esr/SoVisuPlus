import {
  AgentIdentifierType as DbAgentIdentifierType,
  User as DbUser,
} from '@prisma/client'
import { AgentIdentifier } from '@/types/AgentIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'

/** UserDAO: Handles operations related to User records */
export class UserDAO extends AbstractDAO {
  /**
   * Create or update a User record in the database
   * @param personId - The ID of the associated Person
   * @returns The created or updated User record
   */
  public async createOrUpdateUser(personId: number): Promise<DbUser> {
    try {
      return await this.prismaClient.user.upsert({
        where: { personId },
        update: {},
        create: { personId },
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
