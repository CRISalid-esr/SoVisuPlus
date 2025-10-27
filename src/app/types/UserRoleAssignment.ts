import { Role } from '@/types/Role'
import { UserRoleScope } from '@/types/UserRoleScope'

export type UserRoleAssignment = {
  role: Role
  scopes: UserRoleScope[]
}
