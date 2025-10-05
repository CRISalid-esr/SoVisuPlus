import { z } from 'zod'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { RoleService } from '@/lib/services/RoleService'

/* ---------------- Zod schemas (domain-enum driven) ---------------- */
const ActionEnum = z.nativeEnum(PermissionAction)
const SubjectEnum = z.nativeEnum(PermissionSubject)

const PermissionSchema = z.object({
  action: ActionEnum,
  subject: SubjectEnum,
  fields: z.array(z.string().min(1)).optional().default([]),
})

const RoleSchema = z.object({
  name: z.string().min(1),
  system: z.boolean().optional().default(false),
  description: z.string().optional(),
  permissions: z.array(PermissionSchema).default([]),
})

const RolesFileSchema = z.object({
  roles: z.array(RoleSchema).nonempty('roles must contain at least one role'),
})

export type PermissionSeed = z.infer<typeof PermissionSchema>
export type RoleSeed = z.infer<typeof RoleSchema>
export type RolesFileSeed = z.infer<typeof RolesFileSchema>

/* ---------------- Service ---------------- */
export class RoleConfigService {
  /**
   * Validate a parsed YAML object and persist roles/permissions via PermissionService.
   * Normalization (e.g., field de-dupe/sort) is delegated to PermissionService.reset.
   */
  static async load(
    raw: unknown,
  ): Promise<{ roles: number; permissions: number }> {
    const payload = RolesFileSchema.parse(raw)
    this.ensureUniqueRoleNames(payload.roles)
    const svc = new RoleService()
    await svc.reset(payload)

    const totalPerms = payload.roles.reduce(
      (n, r) => n + r.permissions.length,
      0,
    )
    return { roles: payload.roles.length, permissions: totalPerms }
  }
  static ensureUniqueRoleNames(roles: RoleSeed[]) {
    const seen = new Set<string>()
    for (const r of roles) {
      if (seen.has(r.name)) {
        throw new Error(`Duplicate role name in YAML: "${r.name}"`)
      }
      seen.add(r.name)
    }
  }
}
