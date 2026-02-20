import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { PersonMembership } from '@/types/PersonMembership'

class ExternalPerson extends Person {
  constructor(
    uid: string,
    email: string | null,
    displayName: string | null,
    firstName?: string,
    lastName?: string,
    identifiers: PersonIdentifier[] = [],
    memberships: PersonMembership[] = [],
  ) {
    super(
      uid,
      true,
      email,
      displayName,
      firstName || '',
      lastName || '',
      identifiers,
      memberships,
    )
  }
}

export { ExternalPerson }
