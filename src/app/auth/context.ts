import type { AuthzContext, RoleAssignment, Scope } from '@/types/authz'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

export const makeAssignment = (
  role: string,
  permissions: Array<{
    action: PermissionAction
    subject: PermissionSubject
    fields?: string[]
  }>,
  scopes: Scope[] = [],
): RoleAssignment => ({
  role,
  permissions,
  scopes,
})

/** Creates a full AuthzContext and derives roles/scopes for convenience */
export const makeAuthzContext = ({
  userId = 'u-1',
  personUid = null as string | null,
  roleAssignments = [] as RoleAssignment[],
}: {
  userId?: string
  personUid?: string | null
  roleAssignments?: RoleAssignment[]
}): AuthzContext => {
  const roles = roleAssignments.map((r) => r.role)
  const scopes = roleAssignments.flatMap((r) =>
    r.scopes.map((s) => ({ ...s, role: r.role })),
  )
  return { userId, personUid, roleAssignments, roles, scopes }
}
