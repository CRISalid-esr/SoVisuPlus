import { AgentIdentifier } from '@/types/AgentIdentifier'
import { Person as DbPerson } from '@prisma/client'

class Person {
  uid: string
  external: boolean
  email: string | null
  displayName: string
  firstName: string
  lastName: string
  identifiers: AgentIdentifier[]

  constructor(
    uid: string,
    external: boolean,
    email: string | null,
    displayName: string,
    firstName: string,
    lastName: string,
    identifiers: AgentIdentifier[] = [],
  ) {
    this.uid = uid
    this.external = external
    this.email = email
    this.displayName = displayName
    this.firstName = firstName
    this.lastName = lastName
    this.identifiers = identifiers
  }

  //static method to create a Person object from a JSON object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDbPerson(person: DbPerson): Person {
    return new Person(
      person.uid,
      person.external,
      person.email,
      '',
      person.firstName,
      person.lastName,
      'identifiers' in person ? (person.identifiers as AgentIdentifier[]) : [],
    )
  }
}

export { Person }
