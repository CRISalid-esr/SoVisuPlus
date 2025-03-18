import { Person, PersonJson } from '@/types/Person'
import { Person as DbPerson, User as DbUser } from '@prisma/client'

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
    public person?: Person, // Optional person
  ) {}

  setPerson(person: Person): void {
    this.person = person
  }

  getDisplayName(): string {
    return this.person?.displayName || 'n/c'
  }

  static fromDbUser(user: DbUser & { person?: DbPerson }): User {
    const person = user.person ? Person.fromDbPerson(user.person) : undefined
    return new User(user.id, person)
  }

  static fromJsonUser(user: UserJson): User {
    const person = user.person ? Person.fromJson(user.person) : undefined
    return new User(user.id, person)
  }
}

export { User }
export type { UserJson }
