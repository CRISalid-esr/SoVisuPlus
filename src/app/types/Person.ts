import {
  PersonIdentifier,
  PersonIdentifierJson,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier, ORCIDIdentifierJson } from '@/types/OrcidIdentifier'
import {
  PersonIdentifierWithRelations,
  PersonWithRelations,
} from '@/prisma-schema/extended-client'

import { IAgent, IAgentJson } from '@/types/IAgent'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { PersonIdentifier as DbPersonIdentifier } from '@prisma/client'
import { PersonMembership } from '@/types/PersonMembership'
import removeAccents from 'remove-accents'
import { Authorizable, AuthorizationProperties } from '@/types/authorizable'

interface PersonJson extends IAgentJson {
  uid: string
  slug: string | null
  external: boolean
  email?: string | null
  displayName?: string
  firstName?: string
  lastName?: string
  identifiers?: Array<PersonIdentifierJson | ORCIDIdentifierJson>
  memberships?: PersonMembership[]
}

type IdentifierHydrationJson = PersonIdentifierJson | ORCIDIdentifierJson

class Person implements IAgent, Authorizable {
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

  get membershipAcronyms(): string[] {
    return this.memberships
      .map(({ researchUnit: { acronym } }) => acronym)
      .filter((acronym) => acronym !== null)
  }

  get membershipSignatures(): string[] {
    return this.memberships
      .map(({ researchUnit: { signature } }) => signature)
      .filter((signature) => signature !== null)
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

  hasIdHAL(): boolean {
    return this.identifiers.some((id) => id.type == PersonIdentifierType.idhals)
  }

  private static computeDisplayName(
    firstName?: string | null,
    lastName?: string | null,
    fallback?: string | null,
  ): string {
    if (fallback) return fallback
    return `${firstName ?? ''} ${lastName ?? ''}`.trim()
  }

  static fromDbPerson(person: PersonWithRelations): Person {
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
      ('identifiers' in person
        ? (person.identifiers as DbPersonIdentifier[]).map((x) =>
            Person.identifiersFromDB(x),
          )
        : []) as PersonIdentifier[],
      'memberships' in person
        ? person.memberships.map((membership) =>
            PersonMembership.fromDbPersonMembership(membership),
          )
        : [],
      'person',
      person.slug,
    )
  }

  private static identifiersFromJson(
    x: IdentifierHydrationJson,
  ): PersonIdentifier {
    if (ORCIDIdentifier.isOrcidIdentifierJson(x)) {
      return ORCIDIdentifier.fromJson(x)
    }

    return PersonIdentifier.fromJson(x)
  }

  private static identifiersFromDB(
    x: PersonIdentifierWithRelations | DbPersonIdentifier,
  ): PersonIdentifier {
    if (ORCIDIdentifier.isDbOrcidIdentifier(x)) {
      return ORCIDIdentifier.fromDB({
        type: x.type,
        value: x.value,
        orcidIdentifier: x.orcidIdentifier,
      })
    }

    return PersonIdentifier.fromDB({
      type: x.type,
      value: x.value,
    })
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
      (json.identifiers ?? []).map((x) => Person.identifiersFromJson(x)),
      json.memberships ?? [],
      'person',
      json.slug ?? null,
    )
  }

  get authzProperties(): AuthorizationProperties {
    const rs =
      this.memberships
        ?.map((m) => m.researchUnit?.uid)
        .filter((x): x is string => !!x) ?? []
    return {
      __type: 'Person',
      perimeter: {
        Person: [this.uid],
        ResearchUnit: Array.from(new Set(rs)),
      },
    }
  }
}

const isPerson = (agent: IAgent | null | undefined): agent is Person =>
  !!agent && agent.type === 'person'

export { Person, isPerson }
export type { PersonJson }
