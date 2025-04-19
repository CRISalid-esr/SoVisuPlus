import { PersonIdentifier } from '@/app/types/PersonIdentifier'
import { Person as DbPerson } from '@prisma/client'
import { Person } from '@/app/types/Person'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { User } from '@/types/User'

/**
 * Service for handling person-related operations
 */
export class UserService {
  constructor(
    private userDAO: UserDAO,
    private personDAO: PersonDAO,
    private personGraphQLClient: PersonGraphQLClient | null = null,
  ) {}

  /**
   * Check if an authentication profile matches an existing person
   * @param profile Profile with identifiers acknowledged by identity providers
   * @returns True if the profile matches an existing user, false otherwise
   */
  public async submitProfile(profile: AuthenticationProfile): Promise<boolean> {
    let electedIdentifier: PersonIdentifier | null = null
    if (profile.username) {
      electedIdentifier = {
        type: PersonIdentifierType.LOCAL,
        value: profile.username,
      }
    } else if (profile.orcid) {
      electedIdentifier = {
        type: PersonIdentifierType.ORCID,
        value: profile.orcid,
      }
    }
    if (!electedIdentifier) {
      // None of the data provided by the profile allows to identify the user
      return false
    }
    // refresh the user data from the graph API if enabled
    if (this.personGraphQLClient?.isEnabled()) {
      const person: Person | null =
        await this.personGraphQLClient.getPersonByIdentifier(electedIdentifier)
      if (!person) {
        return false
      }
      if (person.external) {
        console.warn(
          `Person {${person.uid}} is external, skipping user creation`,
        )
        return false
      }
      try {
        const dbPerson: DbPerson =
          await this.personDAO.createOrUpdatePerson(person)
        await this.userDAO.createOrUpdateUser(dbPerson.id)
        return true
      } catch (error) {
        console.error(
          `Failed to process person message for UID: ${person.uid}`,
          error,
        )
        return false
      }
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
