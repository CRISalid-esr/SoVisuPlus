import { PersonIdentifier } from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'

class InternalPerson extends Person {
  constructor(
    uid: string,
    email: string | null,
    displayName: string,
    firstName: string,
    lastName: string,
    identifiers: PersonIdentifier[] = [],
  ) {
    super(uid, false, email, displayName, firstName, lastName, identifiers)
  }
}

export { InternalPerson }
