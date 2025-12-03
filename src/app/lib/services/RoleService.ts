import { PermissionSeed, RolesFileSeed } from '@/lib/services/RoleConfigService'
import { RoleDAO } from '@/lib/daos/RoleDAO'
import { EntityType } from '@/types/UserRoleScope'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

type AssignRoleInput = {
  roleName: string
  scope?: { entityType: EntityType; entityUid: string } | null
  user: {
    userId?: number
    personUid?: string
    idType?: PersonIdentifierType | string
    idValue?: string
  }
}

/**
 * Service for handling permissions and roles.
 */
export class RoleService {
  private roleDAO = new RoleDAO()
  private userDAO = new UserDAO()

  /**
   * Normalize a single permission:
   */
  static normalizePermission(p: PermissionSeed): PermissionSeed {
    const fields = Array.from(new Set(p.fields ?? [])).sort()
    return { ...p, fields }
  }

  /**
   * Reset roles & permissions according to the provided (validated) config.
   */
  async reset(config: RolesFileSeed): Promise<void> {
    const normalized = this.normalize(config)

    for (const role of normalized) {
      const dbRole = await this.roleDAO.upsertRole(role.name, {
        description: role.description ?? null,
        system: !!role.system,
      })

      const permissionIds: number[] = []
      for (const p of role.permissions) {
        const dbPerm = await this.roleDAO.findOrCreatePermission({
          action: p.action as unknown as PermissionAction,
          subject: p.subject as unknown as PermissionSubject,
          inverted: false,
          fields: p.fields,
          description: null,
        })
        permissionIds.push(dbPerm.id)
      }

      await this.roleDAO.setRolePermissions(dbRole.id, permissionIds)
    }
    await this.roleDAO.removeOrphanPermissions()
  }

  private normalize(config: RolesFileSeed) {
    return config.roles.map((role) => {
      const perms = role.permissions.map(RoleService.normalizePermission)
      const dedupMap = new Map<string, PermissionSeed>()
      for (const p of perms) dedupMap.set(this.permissionKey(p), p)
      const unique = [...dedupMap.values()].sort((a, b) =>
        this.comparePermission(a, b),
      )
      return { ...role, permissions: unique }
    })
  }

  private permissionKey(p: PermissionSeed): string {
    return [p.action, p.subject, '0', p.fields.join('|')].join('::')
  }

  private comparePermission(a: PermissionSeed, b: PermissionSeed): number {
    if (a.action !== b.action)
      return String(a.action).localeCompare(String(b.action))
    if (a.subject !== b.subject)
      return String(a.subject).localeCompare(String(b.subject))
    return a.fields.join('|').localeCompare(b.fields.join('|'))
  }

  async assignRoleToUser(input: AssignRoleInput): Promise<{
    userId: number
    roleId: number
    roleName: string
    scope: { entityType: EntityType; entityUid: string } | null
  }> {
    const userId = await this.userDAO.resolveUserId({
      userId: input.user.userId,
      personUid: input.user.personUid,
      idType: input.user.idType as PersonIdentifierType | undefined,
      idValue: input.user.idValue,
    })
    if (!userId) {
      throw new Error(
        `User not found for provided selector ${JSON.stringify(input.user)}`,
      )
    }

    const role = await this.roleDAO.getRoleByName(input.roleName)
    if (!role) throw new Error(`Role "${input.roleName}" not found`)

    await this.userDAO.createUserRoleIfNotExists(userId, role.id)

    if (input.scope) {
      await this.userDAO.createUserRoleScopeIfNotExists(
        userId,
        role.id,
        input.scope.entityType,
        input.scope.entityUid,
      )
    } else {
      // Global role: remove any scoped roles for this user & role
      await this.userDAO.deleteUserRoleScopes(userId, role.id)
    }
    return {
      userId,
      roleId: role.id,
      roleName: input.roleName,
      scope: input.scope ?? null,
    }
  }

  async ensureSelfScopedRoles(params: {
    userId: number
    personUid: string
    roleNames: string[]
  }): Promise<void> {
    for (const roleName of params.roleNames) {
      await this.assignRoleToUser({
        roleName,
        scope: { entityType: 'Person', entityUid: params.personUid },
        user: { userId: params.userId },
      })
    }
  }
}
