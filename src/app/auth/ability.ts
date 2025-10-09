import type {
  AppAbility,
  AuthzContext,
  RoleAssignment,
  Scope,
} from '@/types/authz'
import type { User } from '@/types/User'
import { createMongoAbility, RawRuleOf } from '@casl/ability'
import { MongoQuery } from '@ucast/mongo'

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

function scopesToCondition(scopes: Scope[]): Array<MongoQuery | undefined> {
  if (!scopes?.length) return [undefined] // global role

  // Group UIDs by entity type
  const byType = scopes.reduce<Record<string, string[]>>((acc, s) => {
    ;(acc[s.entityType] ||= []).push(s.entityUid)
    return acc
  }, {})

  // For each type: { 'authz.perimeter.<Type>': { $in: [uids...] } }
  const conds: MongoQuery[] = []
  for (const [t, uids] of Object.entries(byType)) {
    if (!uids.length) continue
    conds.push({ [`authzProperties.perimeter.${t}`]: { $in: uids } })
  }
  // if we returned [], 0 rule would be generated for this role assignment
  return conds.length ? conds : [undefined]
}

export function abilityFromAuthzContext(
  p: AuthzContext = EMPTY_PRINCIPAL,
): AppAbility {
  const rules: RawRuleOf<AppAbility>[] = []

  for (const ra of p.roleAssignments) {
    const conds = scopesToCondition(ra.scopes) // array of per-type conditions or [undefined]

    for (const perm of ra.permissions) {
      // the loop runs at least 1 time, even for global roles (conds = [undefined])
      for (const cond of conds) {
        rules.push({
          action: perm.action,
          subject: perm.subject,
          ...(perm.fields?.length ? { fields: perm.fields } : {}),
          ...(cond ? { conditions: cond } : {}),
        })
      }
    }
  }

  return createMongoAbility(rules, {
    detectSubjectType: (obj) =>
      obj?.authzProperties?.__type ?? obj?.__type ?? 'all',
  })
}
