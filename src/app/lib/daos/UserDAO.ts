import { AgentIdentifierType, PrismaClient, User } from '@prisma/client'
import { Person } from '@/types/Person'
import { AgentIdentifier } from '@/types/AgentIdentifier'

export class UserDAO {
  private db: PrismaClient

  constructor() {
    this.db = new PrismaClient()
  }

  /**
   * Create or update a User record in the database
   * @param person - The Person object to upsert
   * @returns The created or updated User record
   */
  public async upsertUser(person: Person): Promise<User> {
    try {
      return await this.db.user.upsert({
        where: {
          person_uid: person.uid,
        },
        update: {
          email: person.email || undefined, // only update email if it's provided
          updatedAt: new Date(),
          AgentIdentifier: {
            deleteMany: {}, // Clear existing identifiers
            create: person.identifiers.map((identifier) => ({
              type: identifier.type.toUpperCase() as AgentIdentifierType,
              value: identifier.value,
            })),
          },
        },
        create: {
          person_uid: person.uid,
          email: person.email || '',
          AgentIdentifier: {
            create: person.identifiers.map((identifier) => ({
              type: identifier.type.toUpperCase() as AgentIdentifierType,
              value: identifier.value,
            })),
          },
        },
        include: {
          AgentIdentifier: true, // Include identifiers in the response
        },
      })
    } catch (error) {
      console.error('Error upserting user:', error)
      throw error
    }
  }

  /**
   * Fetch a User by an AgentIdentifier.
   * @param identifier - The AgentIdentifier to search for.
   * @returns The User record if found, null otherwise.
   */
  public async getUserByIdentifier(
    identifier: AgentIdentifier,
  ): Promise<User | null> {
    try {
      return await this.db.user.findFirst({
        where: {
          AgentIdentifier: {
            some: {
              type: identifier.type.toUpperCase() as AgentIdentifierType,
              value: identifier.value,
            },
          },
        },
        include: {
          AgentIdentifier: true, // Include identifiers in the response
        },
      })
    } catch (error) {
      console.error('Error fetching user by identifier:', error)
      throw error
    }
  }
}
