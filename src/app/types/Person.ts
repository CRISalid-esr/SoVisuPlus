import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { IAgent, IAgentJson } from '@/types/IAgent'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Person as DbPerson } from '@prisma/client'
import { PersonMembership } from '@/types/PersonMembership'
import removeAccents from 'remove-accents'

interface PersonJson extends IAgentJson {
  uid: string
  slug: string | null
  external: boolean
  email?: string | null
  displayName?: string
  firstName?: string
  lastName?: string
  identifiers?: Array<{ type: PersonIdentifierType; value: string }>
}

class Person implements IAgent {
  public normalizedName: string

  constructor(
    public uid: string,
    public external: boolean,
    public email: string | null,
    public displayName: string | null | undefined,
    public firstName: string,
    public lastName: string,
    private identifiers: PersonIdentifier[] = [],
    public memberships: PersonMembership[] = [],
    public type: 'person' = 'person',
    public slug: string | null = null,
  ) {
    this.validateIdentifiers(identifiers)
    this.normalizedName = removeAccents(this.displayNameGuard().toLowerCase())
  }

  getDisplayName(language?: ExtendedLanguageCode): string {
    void language
    return this.displayNameGuard()
  }

  private displayNameGuard(): string {
    this.displayName = (this.displayName?.trim() ||
      Person.computeDisplayName(this.firstName, this.lastName)) as string
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

  private static computeDisplayName(
    firstName?: string | null,
    lastName?: string | null,
    fallback?: string | null,
  ): string {
    if (fallback) return fallback
    return `${firstName ?? ''} ${lastName ?? ''}`.trim()
  }

  static fromDbPerson(person: DbPerson): Person {
    const displayName = Person.computeDisplayName(
      person.firstName,
      person.lastName,
      person.displayName,
    )
    return new Person(
      person.uid,
      person.external,
      person.email,
      displayName,
      person.firstName || '',
      person.lastName || '',
      'identifiers' in person ? (person.identifiers as PersonIdentifier[]) : [],
      [],
      'person',
      person.slug,
    )
  }

  static fromJson(json: PersonJson): Person {
    const displayName = Person.computeDisplayName(
      json.firstName,
      json.lastName,
      json.displayName ?? null,
    )
    return new Person(
      json.uid,
      json.external,
      json.email ?? null,
      displayName,
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
