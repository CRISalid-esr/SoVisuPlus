import { MongoAbility, Subject } from '@casl/ability'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { EntityType } from '@/types/UserRoleScope'
import { MongoQuery } from '@ucast/mongo'

export type AppAbility = MongoAbility<
  [PermissionAction, PermissionSubject | Subject],
  MongoQuery
>

export type Scope = { entityType: EntityType; entityUid: string }
export type PermissionGrant = {
  action: PermissionAction
  subject: PermissionSubject
  fields?: string[]
}

export type RoleAssignment = {
  role: string
  permissions: PermissionGrant[]
  scopes: Scope[]
}

export interface AuthzContext {
  userId: string
  personUid?: string | null

  roleAssignments: RoleAssignment[]

  roles: string[]
  scopes: Array<Scope & { role: string }>
}
