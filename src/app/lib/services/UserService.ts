import { PersonIdentifier } from '@/app/types/PersonIdentifier'
import { Person as DbPerson, User } from '@prisma/client'
import { Person } from '@/app/types/Person'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonDAO } from '@/lib/daos/PersonDAO'

/**
 * Service for handling person-related operations
 */
export class UserService {
  private personGraphQLClient: PersonGraphQLClient
  private userDAO: UserDAO
  private personDAO: PersonDAO

  constructor(
    personGraphQLClient: PersonGraphQLClient,
    userDAO: UserDAO,
    personDAO: PersonDAO,
  ) {
    this.personGraphQLClient = personGraphQLClient
    this.userDAO = userDAO
    this.personDAO = personDAO
  }

  /**
   * Check if an authentication profile matches an existing person
   * @param profile Profile with identifiers acknowledged by identity providers
   * @returns True if the profile matches an existing user, false otherwise
   */
  public async submitProfile(profile: AuthenticationProfile): Promise<boolean> {
    let electedIdentifier: PersonIdentifier | null = null
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
        await this.personGraphQLClient.getPersonByIdentifier(electedIdentifier)
      if (!person) {
        return false
      }
      if (person.external) {
        console.log(
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
    // Anyway, look up the user in the database
    const user: User | null =
      await this.userDAO.getUserByIdentifier(electedIdentifier)
    return !!user
  }
}
