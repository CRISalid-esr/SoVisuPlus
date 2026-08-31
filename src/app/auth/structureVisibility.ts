import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { hasUnscopedPermission } from '@/app/auth/ability'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

/**
 * Server-side gate of the structure visibility feature, shared by every
 * organization route that has to treat hidden structures differently.
 *
 * The permission is deliberately checked as **unscoped**: `OrganizationUnit`
 * carries no `authzProperties`, so a CASL instance check cannot narrow it —
 * `structure_manager` is a global role or nothing.
 */
export const structureVisibilityAccess = async (): Promise<{
  session: Session | null
  canManage: boolean
}> => {
  const session = await getServerSession(authOptions)
  return {
    session,
    canManage: hasUnscopedPermission(
      session?.user?.authz,
      PermissionAction.update,
      PermissionSubject.OrganizationUnit,
      'hidden',
    ),
  }
}

/** True when the caller asked for hidden structures and is allowed to see them. */
export const resolveIncludeHidden = async (
  searchParams: URLSearchParams,
): Promise<boolean> => {
  if (searchParams.get('includeHidden') !== 'true') {
    return false
  }
  const { canManage } = await structureVisibilityAccess()
  return canManage
}
