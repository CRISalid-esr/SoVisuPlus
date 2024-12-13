import { PrismaClient, User } from '@prisma/client'

export class UserDatabase {
  private db: PrismaClient

  constructor() {
    this.db = new PrismaClient()
  }

  /**
   * Create or update a User record in the database.
   */
  async upsertUser(userData: Partial<User>): Promise<User> {
    try {
      return await this.db.user.upsert({
        where: { id: userData.id },
        update: { ...userData, updatedAt: new Date() },
        create: userData as User,
      })
    } catch (error) {
      console.error('Error upserting user in database:', error)
      throw error
    }
  }

  /**
   * Delete a User record from the database.
   */
  async deleteUser(id: number): Promise<void> {
    try {
      await this.db.user.delete({ where: { id } })
    } catch (error) {
      console.error('Error deleting user from database:', error)
      // Handle case where the user does not exist
    }
  }

  /**
   * Fetch a User record from the database.
   */
  async getUser(id: number): Promise<User | null> {
    try {
      return await this.db.user.findUnique({ where: { id } })
    } catch (error) {
      console.error('Error fetching user from database:', error)
      throw error
    }
  }
}
