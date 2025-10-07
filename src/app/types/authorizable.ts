import { EntityType } from '@/types/UserRoleScope'
import { PermissionSubject } from '@/types/Permission'

export type ScopeMap = Partial<Record<EntityType, string[]>>

export type AuthorizationView = {
  __type: PermissionSubject
  perimeter?: ScopeMap
  [key: string]: unknown
}

export interface Authorizable {
  /** Read-only view used by CASL */
  readonly authz: AuthorizationView
}
