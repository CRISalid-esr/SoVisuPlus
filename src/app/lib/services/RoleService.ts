import { PermissionSeed, RolesFileSeed } from '@/lib/services/RoleConfigService'
import { RoleDAO } from '@/lib/daos/RoleDAO'
import {
  PermissionAction as DbPermissionAction,
  PermissionSubject as DbPermissionSubject,
} from '@prisma/client'

/**
 * Service for handling permissions and roles.
 */
export class RoleService {
  private dao = new RoleDAO()

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
      const dbRole = await this.dao.upsertRole(role.name, {
        description: role.description ?? null,
        system: !!role.system,
      })

      const permissionIds: number[] = []
      for (const p of role.permissions) {
        const dbPerm = await this.dao.findOrCreatePermission({
          action: p.action as unknown as DbPermissionAction,
          subject: p.subject as unknown as DbPermissionSubject,
          inverted: false,
          fields: p.fields,
          description: null,
        })
        permissionIds.push(dbPerm.id)
      }

      await this.dao.setRolePermissions(dbRole.id, permissionIds)
    }
  }

  private normalize(config: RolesFileSeed) {
    const normalized = config.roles.map((role) => {
      const perms = role.permissions.map(RoleService.normalizePermission)
      const dedupMap = new Map<string, PermissionSeed>()
      for (const p of perms) dedupMap.set(this.permissionKey(p), p)
      const unique = [...dedupMap.values()].sort((a, b) =>
        this.comparePermission(a, b),
      )
      return { ...role, permissions: unique }
    })
    return normalized
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
}
