import { UserRoleWithRelations } from '@/prisma-schema/extended-client'
import { Role } from '@/types/Role'
import { UserRoleScope } from '@/types/UserRoleScope'

class UserRole {
  constructor(
    public userId: number,
    public roleId: number,
    public role?: Role,
    public scopes: UserRoleScope[] = [],
  ) {}

  static fromDbUserRole(db: UserRoleWithRelations): UserRole {
    const role = db.role ? Role.fromDbRole(db.role) : undefined
    const scopes = db.scopes?.map(UserRoleScope.fromDbUserRoleScope) ?? []
    return new UserRole(db.userId, db.roleId, role, scopes)
  }
}

export { UserRole }
