import { User as DbUser } from '@prisma/client'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { User } from '@/types/User'
import { EntityType } from '@/types/UserRoleScope'

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
                type: identifier.type,
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
                      signature: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  system: true,
                },
              },
              scopes: {
                select: {
                  entityType: true,
                  entityUid: true,
                },
              },
            },
          },
        },
      })

      if (!dbUser || !dbUser.person) return null

      return User.fromDbUser(dbUser)
    } catch (error) {
      console.error('Error fetching user by identifier:', error as Error)
      return null
    }
  }

  async resolveUserId(input: {
    userId?: number
    personUid?: string
    idType?: PersonIdentifierType
    idValue?: string
  }): Promise<number | null> {
    if (input.userId != null) {
      const exists = await this.prismaClient.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      return exists?.id ?? null
    }

    if (input.personUid) {
      const person = await this.prismaClient.person.findUnique({
        where: { uid: input.personUid },
        select: { id: true },
      })
      if (!person) return null
      const u = await this.prismaClient.user.findUnique({
        where: { personId: person.id },
        select: { id: true },
      })
      return u?.id ?? null
    }

    if (input.idType && input.idValue) {
      const person = await this.prismaClient.person.findFirst({
        where: {
          identifiers: {
            some: { type: input.idType, value: input.idValue },
          },
        },
        select: { id: true },
      })
      if (!person) return null
      const u = await this.prismaClient.user.findUnique({
        where: { personId: person.id },
        select: { id: true },
      })
      return u?.id ?? null
    }

    return null
  }

  async createUserRoleIfNotExists(
    userId: number,
    roleId: number,
  ): Promise<void> {
    await this.prismaClient.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      update: {},
      create: { userId, roleId },
    })
  }

  async createUserRoleScopeIfNotExists(
    userId: number,
    roleId: number,
    entityType: EntityType,
    entityUid: string,
  ): Promise<void> {
    await this.prismaClient.userRoleScope.upsert({
      where: {
        userId_roleId_entityType_entityUid: {
          userId,
          roleId,
          entityType: entityType as EntityType,
          entityUid,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
        entityType: entityType as EntityType,
        entityUid,
      },
    })
  }

  async deleteUserRoleScopes(userId: number, roleId: number): Promise<void> {
    await this.prismaClient.userRoleScope.deleteMany({
      where: { userId, roleId },
    })
  }
}
