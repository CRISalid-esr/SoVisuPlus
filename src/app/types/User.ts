import { Person } from '@/types/Person'
import { User as DbUser } from '@prisma/client'
import { Person as DbPerson } from '@prisma/client'

class User {
  id: string | number
  username: string
  person?: Person // Optional property for the associated Person

  constructor(id: string | number, username: string, person?: Person) {
    this.id = id
    this.username = username
    if (person) {
      this.person = person
    }
  }

  setPerson(person: Person): void {
    this.person = person
  }

  // Example method
  getDisplayName(): string {
    return this.person?.displayName || this.username
  }
  static fromDbUser(user: DbUser & { person?: DbPerson }): User {
    const person = user.person ? Person.fromDbPerson(user.person) : undefined
    return new User(user.id, '', person)
  }
}

export { User }
