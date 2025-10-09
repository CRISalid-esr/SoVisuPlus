import { EntityType } from '@/types/UserRoleScope'
import { PermissionSubject } from '@/types/Permission'

export type ScopeMap = Partial<Record<EntityType, string[]>>

export type AuthorizationProperties = {
  __type: PermissionSubject
  perimeter?: ScopeMap
  [key: string]: unknown
}

export interface Authorizable {
  /** The mongo-style CASL `subject` the ability rules are resolved against */
  readonly authzProperties: AuthorizationProperties
}
