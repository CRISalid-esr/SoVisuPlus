import {
  PersonIdentifierType as DbPersonIdentifierType,
  User as DbUser,
} from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { User } from '@/types/User'

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
   * Fetch a User by an PersonIdentifier.
   * @param identifier - The PersonIdentifier to search for.
   * @returns The User record if found, null otherwise.
   */
  public async getUserByIdentifier(
    identifier: PersonIdentifier,
  ): Promise<User | null> {
    try {
      const dbUser = await this.prismaClient.user.findFirst({
        where: {
          person: {
            identifiers: {
              some: {
                type: identifier.type.toUpperCase() as DbPersonIdentifierType,
                value: identifier.value,
              },
            },
          },
        },
        include: {
          person: {
            include: {
              identifiers: true,
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
          },
        },
      })
      if (!dbUser || !dbUser.person) {
        return null
      }
      return User.fromDbUser(dbUser)
    } catch (error) {
      console.error('Error fetching user by identifier:', error as Error)
      return null
    }
  }
}
