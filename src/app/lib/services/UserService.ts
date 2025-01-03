import { AgentIdentifier } from '@/app/types/AgentIdentifier'
import { User } from '@prisma/client'
import { Person } from '@/app/types/Person'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'

/**
 * Service for handling person-related operations
 */
export class UserService {
  private personGraphQLClient: PersonGraphQLClient
  private userDAO: UserDAO

  constructor(personGraphQLClient: PersonGraphQLClient, userDAO: UserDAO) {
    this.personGraphQLClient = personGraphQLClient
    this.userDAO = userDAO
  }

  /**
   * Check if an authentication profile matches an existing person
   * @param profile Profile with identifiers acknowledged by identity providers
   * @returns True if the profile matches an existing user, false otherwise
   */
  public async submitProfile(profile: AuthenticationProfile): Promise<boolean> {
    let electedIdentifier: AgentIdentifier | null = null
    if (profile.username) {
      electedIdentifier = {
        type: 'local',
        value: profile.username,
      }
    } else if (profile.orcid) {
      electedIdentifier = {
        type: 'orcid',
        value: profile.orcid,
      }
    }
    if (!electedIdentifier) {
      // None of the data provided by the profile allows to identify the user
      return false
    }
    // refresh the user data from the graph API if enabled
    if (this.personGraphQLClient.isEnabled()) {
      const person: Person | null =
        await this.personGraphQLClient.getPerson(electedIdentifier)
      if (person) {
        await this.userDAO.createOrUpdateUserFor(person)
        return true
      }
    }
    // Anyway, look up the user in the database
    const user: User | null =
      await this.userDAO.getUserByIdentifier(electedIdentifier)
    return !!user
  }
}
