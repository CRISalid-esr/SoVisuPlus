import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'

class ExternalPerson extends Person {
  constructor(
    uid: string,
    email: string | null,
    displayName: string,
    firstName?: string,
    lastName?: string,
    identifiers: PersonIdentifier[] = [],
  ) {
    super(
      uid,
      true,
      email,
      displayName,
      firstName || '',
      lastName || '',
      identifiers,
    )
  }
}

export { ExternalPerson }
