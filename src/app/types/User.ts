import { Person, PersonJson } from '@/types/Person'
import { UserWithRelations } from '@/prisma-schema/extended-client'
import { Role } from '@/types/Role'
import { UserRoleAssignment } from '@/types/UserRoleAssignment'

interface UserJson {
  id: string | number
  username: string
  person?: PersonJson
}

class User {
  /**
   * Constructor
   * @param id
   * @param person
   */
  constructor(
    public id: string | number,
    public person?: Person,
    public rolesAssignments: UserRoleAssignment[] = [],
  ) {}

  get roleNames(): string[] {
    return this.rolesAssignments.map((ra) => ra.role.name)
  }

  setPerson(person: Person): void {
    this.person = person
  }

  getDisplayName(): string {
    return this.person?.displayName || 'n/c'
  }

  static fromDbUser(db: UserWithRelations): User {
    const person = db.person ? Person.fromDbPerson(db.person) : undefined

    const rolesAssignments: UserRoleAssignment[] = (db.roles ?? []).map(
      (ur) => ({
        role: Role.fromDbRole(ur.role),
        scopes: (ur.scopes ?? []).map((s) => ({
          id: s.id,
          userId: s.userId,
          roleId: s.roleId,
          entityType: s.entityType,
          entityUid: s.entityUid,
        })),
      }),
    )

    return new User(db.id, person, rolesAssignments)
  }

  static fromJsonUser(user: UserJson): User {
    const person = user.person ? Person.fromJson(user.person) : undefined
    return new User(user.id, person)
  }
}

export { User }
export type { UserJson }
