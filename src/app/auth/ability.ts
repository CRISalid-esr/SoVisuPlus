import type {
  AppAbility,
  AuthzContext,
  RoleAssignment,
  Scope,
} from '@/types/authz'
import type { User } from '@/types/User'
import { AbilityBuilder, createMongoAbility } from '@casl/ability'

export const EMPTY_PRINCIPAL: AuthzContext = {
  userId: '',
  personUid: null,
  roleAssignments: [],
  roles: [],
  scopes: [],
}

export const userToAuthzContext = (
  u: User,
  fallbackUserId?: string,
): AuthzContext => {
  const roleAssignments: RoleAssignment[] = u.rolesAssignments.map((ra) => ({
    role: ra.role.name,
    permissions: ra.role.permissions.map((p) => ({
      action: p.action,
      subject: p.subject,
      fields: p.fields?.length ? p.fields : undefined,
    })),
    scopes: ra.scopes.map((s) => ({
      entityType: s.entityType,
      entityUid: s.entityUid,
    })),
  }))

  const roles = roleAssignments.map((r) => r.role)
  const scopes = roleAssignments.flatMap((r) =>
    r.scopes.map((s) => ({ ...s, role: r.role })),
  )

  return {
    userId: String(u.id ?? fallbackUserId ?? ''),
    personUid: u.person?.uid ?? null,
    roleAssignments,
    roles,
    scopes,
  }
}

const scopesToCondition = (scopes: Scope[]) => {
  const byType = scopes.reduce<Record<string, string[]>>((acc, s) => {
    ;(acc[s.entityType] ||= []).push(s.entityUid)
    return acc
  }, {})
  const ors = Object.entries(byType).map(([t, uids]) => ({
    [`perimeter.${t}`]: { $in: uids },
  }))
  return ors.length ? { $or: ors } : undefined
}

export const abilityFromAuthzContext = (
  p: AuthzContext = EMPTY_PRINCIPAL,
): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  for (const ra of p.roleAssignments) {
    const cond = scopesToCondition(ra.scopes) // MongoQuery | undefined
    for (const perm of ra.permissions) {
      can(
        perm.action,
        perm.subject,
        perm.fields?.length ? perm.fields : undefined,
        cond,
      )
    }
  }

  return build({
    detectSubjectType: (obj) => obj.__type || 'all',
  })
}
