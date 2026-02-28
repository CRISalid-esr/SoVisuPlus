import { PersonIdentifier } from '@/app/types/PersonIdentifier'
import { UserDAO } from '@/lib/daos/UserDAO'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { User } from '@/types/User'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
/**
 * Service for handling person-related operations
 */
export class UserService {
  private userDAO: UserDAO

  constructor() {
    this.userDAO = new UserDAO()
  }

  /**
   * Check if an authentication profile matches an existing person
   * @param profile Profile with identifiers acknowledged by identity providers
   * @returns True if the profile matches an existing user, false otherwise
   */
  public async submitProfile(profile: AuthenticationProfile): Promise<boolean> {
    let electedIdentifier: PersonIdentifier | null = null
    if (profile.username) {
      electedIdentifier = new PersonIdentifier(
        PersonIdentifierType.local,
        profile.username,
      )
    } else if (profile.orcid) {
      electedIdentifier = new PersonIdentifier(
        PersonIdentifierType.orcid,
        profile.orcid,
      )
    }
    if (!electedIdentifier) {
      // None of the data provided by the profile allows to identify the user
      return false
    }
    const user = await this.userDAO.getUserByIdentifier(electedIdentifier)
    return !!user
  }

  /**
   * Get user by Identifier
   * @param id Database id of the user
   * @returns User if found, null otherwise
   * */
  public async getUserByPersonIdentifier(
    identifier: PersonIdentifier,
  ): Promise<User | null> {
    return await this.userDAO.getUserByIdentifier(identifier)
  }
}
