import { Session } from 'next-auth'
import { hasUnscopedPermission } from '@/app/auth/ability'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { AgentType } from '@/types/IAgent'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'

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

export const isHiddenPerspective = async (
  uid: string,
  type: AgentType,
): Promise<boolean> => {
  if (type === 'person' || !uid) {
    return false
  }
  const visibility = await new OrganizationUnitService().fetchVisibilityState(
    uid,
  )
  return visibility?.hiddenEffective ?? false
}
