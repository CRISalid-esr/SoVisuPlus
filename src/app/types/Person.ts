import { AgentIdentifier } from '@/types/AgentIdentifier'

class Person {
  uid: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  identifiers: AgentIdentifier[]

  constructor(
    uid: string,
    email: string,
    displayName: string,
    firstName: string,
    lastName: string,
    identifiers: AgentIdentifier[] = [],
  ) {
    this.uid = uid
    this.email = email
    this.displayName = displayName
    this.firstName = firstName
    this.lastName = lastName
    this.identifiers = identifiers
  }
}

export { Person }
