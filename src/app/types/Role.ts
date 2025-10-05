import { Permission } from '@/types/Permission'
import { RoleWithRelations } from '@/prisma-schema/extended-client'

class Role {
  constructor(
    public id: number,
    public name: string,
    public description: string | null = null,
    public system: boolean = false,
    public permissions: Permission[] = [],
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  static fromDbRole(db: RoleWithRelations): Role {
    const perms =
      db.permissions?.map((rp) => Permission.fromDbPermission(rp.permission)) ??
      []
    return new Role(
      db.id,
      db.name,
      db.description ?? null,
      db.system ?? false,
      perms,
      db.createdAt,
      db.updatedAt,
    )
  }
}

export { Role }
