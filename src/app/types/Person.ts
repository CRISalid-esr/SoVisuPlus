import { AgentIdentifier } from '@/types/AgentIdentifier'
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
    email: string,
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
  static fromDbPerson(person: any): Person {
    return new Person(
      person.uid,
      person.external,
      person.email,
      person.displayName,
      person.firstName,
      person.lastName,
      person.identifiers,
    )
  }
}

export { Person }
