import { AgentIdentifier } from '@/app/types/agentIdentifier'
import { PersonApiService } from './PersonApi.service'
import { UserDatabase } from './PersonDatabase.service'
import { User } from '@prisma/client'

export class PersonService {
  private api: PersonApiService
  private database: UserDatabase

  constructor() {
    this.api = new PersonApiService()
    this.database = new UserDatabase()
  }

  /**
   * Update User data by fetching from the Graph API and syncing with the database.
   */
  async update(identifier: AgentIdentifier): Promise<void> {
    const userData: Partial<User> = await this.api.getPerson(identifier)
    await this.database.upsertUser(userData)
  }
}
