import { PersonIdentifier } from '@/app/types/PersonIdentifier'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { RoleService } from '@/lib/services/RoleService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { User } from '@/types/User'
import { Person } from '@/types/Person'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

export type ProvisionUserParams = {
  /** Local username, matched against Keycloak's preferred_username at sign-in */
  username: string
  firstName: string
  lastName: string
  email?: string | null
  displayName?: string | null
  /** Roles assigned scoped to the created person (Person:<uid>) */
  selfScopedRoles?: string[]
  /** Roles assigned with global scope */
  globalRoles?: string[]
}

export type ProvisionUserResult = {
  personUid: string
  personId: number
  userId: number
}

/**
 * Service for handling person-related operations
 */
export class UserService {
  private userDAO: UserDAO
  private personDAO: PersonDAO

  constructor() {
    this.userDAO = new UserDAO()
    this.personDAO = new PersonDAO()
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

  /**
   * Manually provision a user before their person arrives through AMQP.
   *
   * The person is created with uid `local-<username>` and a local identifier,
   * following the graph's uid convention, so a later AMQP message for the same
   * person upserts the same row instead of conflicting.
   */
  public async provisionUser(
    params: ProvisionUserParams,
  ): Promise<ProvisionUserResult> {
    const uid = `local-${params.username}`
    const person = new Person(
      uid,
      false,
      params.email ?? null,
      params.displayName ?? null,
      params.firstName,
      params.lastName,
      [new PersonIdentifier(PersonIdentifierType.local, params.username)],
    )
    const dbPerson = await this.personDAO.createOrUpdatePerson(person)
    const dbUser = await this.userDAO.createOrUpdateUser(dbPerson.id)

    const roleService = new RoleService()
    if (params.selfScopedRoles?.length) {
      await roleService.ensureSelfScopedRoles({
        userId: dbUser.id,
        personUid: uid,
        roleNames: params.selfScopedRoles,
      })
    }
    for (const roleName of params.globalRoles ?? []) {
      await roleService.assignRoleToUser({
        roleName,
        user: { userId: dbUser.id },
      })
    }

    return { personUid: uid, personId: dbPerson.id, userId: dbUser.id }
  }
}
