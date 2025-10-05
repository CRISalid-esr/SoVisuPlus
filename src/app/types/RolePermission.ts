import { RolePermission as DbRolePermission } from '@prisma/client'

class RolePermission {
  constructor(
    public roleId: number,
    public permissionId: number,
  ) {}

  static fromDbRolePermission(db: DbRolePermission): RolePermission {
    return new RolePermission(db.roleId, db.permissionId)
  }
}

export { RolePermission }
