import { PersonIdentifier } from '@/app/types/PersonIdentifier'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonAlreadyExistsError, PersonDAO } from '@/lib/daos/PersonDAO'
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
 * Thrown when provisioning targets a person that already exists. Provisioning
 * exists solely to pre-create an account before the person arrives through
 * AMQP; roles for existing users are granted with `npm run assign_role`.
 */
export class ProvisionConflictError extends Error {
  constructor(uid: string) {
    super(
      `Person ${uid} already exists — provisioning never overwrites an existing person. ` +
        `Use "npm run assign_role" to grant roles to an existing user.`,
    )
    this.name = 'ProvisionConflictError'
  }
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
   *
   * Provisioning is strictly create-only: it must never overwrite a person
   * that already exists (whether previously provisioned or arrived through
   * AMQP). Throws {@link ProvisionConflictError} when the uid or the local
   * identifier is already taken.
   */
  public async provisionUser(
    params: ProvisionUserParams,
  ): Promise<ProvisionUserResult> {
    const uid = `local-${params.username}`
    const localIdentifier = new PersonIdentifier(
      PersonIdentifierType.local,
      params.username,
    )

    const existing =
      (await this.personDAO.fetchPersonByUid(uid)) ??
      (await this.personDAO.fetchPersonByIdentifier(localIdentifier))
    if (existing) {
      throw new ProvisionConflictError(existing.uid)
    }

    const person = new Person(
      uid,
      false,
      params.email ?? null,
      params.displayName ?? null,
      params.firstName,
      params.lastName,
      [localIdentifier],
    )
    let dbPerson
    try {
      dbPerson = await this.personDAO.createPerson(person)
    } catch (error) {
      if (error instanceof PersonAlreadyExistsError) {
        // Created between the check above and the insert (concurrent AMQP message)
        throw new ProvisionConflictError(uid)
      }
      throw error
    }
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
