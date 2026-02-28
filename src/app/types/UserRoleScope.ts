import {
  UserRoleScope as DbUserRoleScope,
  EntityType as DbEntityType,
} from '@prisma/client'

class UserRoleScope {
  constructor(
    public id: number,
    public userId: number,
    public roleId: number,
    public entityType: DbEntityType,
    public entityUid: string,
  ) {}

  static fromDbUserRoleScope(db: DbUserRoleScope): UserRoleScope {
    return new UserRoleScope(
      db.id,
      db.userId,
      db.roleId,
      db.entityType,
      db.entityUid,
    )
  }
}

export { UserRoleScope }
export { DbEntityType as EntityType }
