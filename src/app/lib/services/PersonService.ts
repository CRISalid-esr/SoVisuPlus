import { AgentIdentifier } from '@/app/types/AgentIdentifier'
import { User } from '@prisma/client'
import { Person } from '@/app/types/Person'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'

export class PersonService {
  private personApiService: PersonGraphQLClient
  private personDAO: UserDAO

  constructor() {
    this.personApiService = new PersonGraphQLClient()
    this.personDAO = new UserDAO()
  }

  /**
   * Check if an authentication profile matches an existing person
   * @param profile Profile with identifiers acknowledged by identity providers
   * @returns True if the profile matches an existing person, false otherwise
   */
  public async submitProfile(profile: AuthenticationProfile): Promise<boolean> {
    let electedIdentifier: AgentIdentifier | null = null
    if (profile.username) {
      electedIdentifier = {
        type: 'local',
        value: profile.username,
      }
    }
    if (!electedIdentifier) {
      // None of the data provided by the profile allows to identify the user
      return false
    }
    // refresh the user data from the graph API if enabled
    if (this.personApiService.isEnabled()) {
      const person: Person | null =
        await this.personApiService.getPerson(electedIdentifier)
      if (person) {
        await this.personDAO.upsertUser(person)
        return true
      }
    }
    // Anyways, look up the user in the database
    const user: User | null =
      await this.personDAO.getUserByIdentifier(electedIdentifier)
    return !!user
  }
}
