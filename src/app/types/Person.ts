import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { Person as DbPerson } from '@prisma/client'
import { IAgent } from '@/types/IAgent'

class Person implements IAgent {
  constructor(
    public uid: string,
    public external: boolean,
    public email: string | null,
    public displayName: string,
    public firstName: string,
    public lastName: string,
    private identifiers: PersonIdentifier[] = [],
    public type: 'person' = 'person',
  ) {
    this.validateIdentifiers(identifiers) // Use the setter to validate on initialization
  }

  getIdentifiers(): PersonIdentifier[] {
    return this.identifiers
  }

  setIdentifiers(value: PersonIdentifier[]) {
    this.validateIdentifiers(value) // Validate before setting
    this.identifiers = value
  }

  private validateIdentifiers(identifiers: PersonIdentifier[]) {
    identifiers.forEach((identifier) => {
      if (!identifier.type) {
        throw new Error('Identifier type is required')
      }
      if (!Object.values(PersonIdentifierType).includes(identifier.type)) {
        throw new Error(
          `${identifier.type} is not a valid PersonIdentifierType`,
        )
      }
      if (!identifier.value) {
        throw new Error('Identifier value is required')
      }
    })
  }

  static fromDbPerson(person: DbPerson): Person {
    return new Person(
      person.uid,
      person.external,
      person.email,
      `${person.firstName} ${person.lastName}`,
      person.firstName || '',
      person.lastName || '',
      'identifiers' in person ? (person.identifiers as PersonIdentifier[]) : [],
    )
  }
}

export { Person }
