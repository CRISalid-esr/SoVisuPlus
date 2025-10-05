import {
  Permission as DbPermission,
  PermissionAction as DbPermissionAction,
  PermissionSubject as DbPermissionSubject,
} from '@prisma/client'

type PermissionConditions = Record<string, unknown> | null

class Permission {
  constructor(
    public id: number,
    public action: DbPermissionAction,
    public subject: DbPermissionSubject,
    public fields: string[] = [],
    public inverted: boolean = false,
    public conditions: PermissionConditions = null,
    public description: string | null = null,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  static fromDbPermission(db: DbPermission): Permission {
    return new Permission(
      db.id,
      db.action,
      db.subject,
      db.fields ?? [],
      db.inverted ?? false,
      (db.conditions as PermissionConditions) ?? null,
      db.description ?? null,
      db.createdAt,
      db.updatedAt,
    )
  }
}

export { Permission }
export {
  DbPermissionAction as PermissionAction,
  DbPermissionSubject as PermissionSubject,
}
