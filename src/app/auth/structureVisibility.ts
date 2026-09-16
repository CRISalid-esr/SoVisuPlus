import { Session } from 'next-auth'
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
export const canManageStructureVisibility = (session: Session): boolean =>
  hasUnscopedPermission(
    session.user?.authz,
    PermissionAction.update,
    PermissionSubject.OrganizationUnit,
    'hidden',
  )

/** True when the caller asked for hidden structures and is allowed to see them. */
export const resolveIncludeHidden = (
  searchParams: URLSearchParams,
  session: Session,
): boolean =>
  searchParams.get('includeHidden') === 'true' &&
  canManageStructureVisibility(session)
