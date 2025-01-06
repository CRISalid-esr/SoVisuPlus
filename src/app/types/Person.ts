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
}

export { Person }
