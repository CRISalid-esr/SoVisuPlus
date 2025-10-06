import { EntityType } from '@/types/UserRoleScope'
import { PermissionSubject } from '@/types/Permission'

export type ScopeMap = Partial<Record<EntityType, string[]>>

export type AuthorizationSubject = {
  /** CASL subject type */
  __type: PermissionSubject
  /** Perimeter used for scope-based conditions */
  perimeter?: ScopeMap
  /** Allows any other information for future use cases */
  [key: string]: unknown
}

export interface Authorizable {
  toAuthz(): AuthorizationSubject
}
