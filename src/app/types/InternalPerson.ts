import { PersonIdentifier } from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'
import { PersonMembership } from '@/types/PersonMembership'

class InternalPerson extends Person {
  constructor(
    uid: string,
    email: string | null,
    displayName: string | null,
    firstName: string,
    lastName: string,
    identifiers: PersonIdentifier[] = [],
    memberships: PersonMembership[] = [],
  ) {
    super(
      uid,
      false,
      email,
      displayName,
      firstName,
      lastName,
      identifiers,
      memberships,
    )
  }
}

export { InternalPerson }
