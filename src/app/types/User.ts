import { Person } from '@/types/Person'
import { Person as DbPerson, User as DbUser } from '@prisma/client'

class User {
  /**
   * Constructor
   * @param id
   * @param username
   * @param person
   */
  constructor(
    public id: string | number,
    public username: string,
    public person?: Person, // Optional person
  ) {}

  setPerson(person: Person): void {
    this.person = person
  }

  getDisplayName(): string {
    return this.person?.displayName || this.username
  }

  static fromDbUser(user: DbUser & { person?: DbPerson }): User {
    const person = user.person ? Person.fromDbPerson(user.person) : undefined
    return new User(user.id, '', person)
  }
}

export { User }
