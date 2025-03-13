import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { IAgent } from '@/types/IAgent'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Person as DbPerson } from '@prisma/client'
import { PersonMembership } from '@/types/PersonMembership'

interface PersonJson {
  uid: string
  slug: string | null // TODO remove when slug will be not nullable
  external: boolean
  email?: string | null
  displayName?: string
  firstName?: string
  lastName?: string
  identifiers?: Array<{ type: PersonIdentifierType; value: string }>
}

class Person implements IAgent {
  constructor(
    public uid: string,
    public external: boolean,
    public email: string | null,
    public displayName: string,
    public firstName: string,
    public lastName: string,
    private identifiers: PersonIdentifier[] = [],
    public memberships: PersonMembership[] = [],
    public type: 'person' = 'person',
    public slug: string | null = null, //TODO make non-nullable
  ) {
    this.validateIdentifiers(identifiers) // Use the setter to validate on initialization
  }

  getDisplayName(language?: ExtendedLanguageCode): string {
    void language
    return this.displayName
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
      person.displayName || `${person.firstName} ${person.lastName}`,
      person.firstName || '',
      person.lastName || '',
      'identifiers' in person ? (person.identifiers as PersonIdentifier[]) : [],
      [],
      'person',
      person.slug,
    )
  }

  static fromJsonPerson(json: PersonJson): Person {
    return new Person(
      json.uid,
      json.external,
      json.email ?? null,
      json.displayName ||
        `${json.firstName ?? ''} ${json.lastName ?? ''}`.trim(),
      json.firstName ?? '',
      json.lastName ?? '',
      json.identifiers ?? [],
      [],
      'person',
      json.slug ?? null,
    )
  }
}

export { Person }
export type { PersonJson }
