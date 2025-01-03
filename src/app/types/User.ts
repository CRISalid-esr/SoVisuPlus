import { Person } from '@/types/Person'

class User {
  id: string
  username: string
  person?: Person // Optional property for the associated Person

  constructor(id: string, username: string, person?: Person) {
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
}

export { User }
