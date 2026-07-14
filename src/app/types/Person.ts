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
import { PersonEmployment } from '@/types/PersonEmployment'
import { SourcePerson, SourcePersonJson } from '@/types/SourcePerson'
import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'
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
  employments?: PersonEmployment[]
  records: SourcePersonJson[]
}

type IdentifierHydrationJson = PersonIdentifierJson | ORCIDIdentifierJson

class Person implements IAgent, Authorizable {
  public normalizedName: string
  /** EMPLOYED_AT relationships — populated alongside memberships */
  public employments: PersonEmployment[] = []

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
    public records: SourcePerson[] = [],
  ) {
    this.validateIdentifiers(identifiers)
    this.normalizedName = removeAccents(this.displayNameGuard().toLowerCase())
  }

  get membershipAcronyms(): string[] {
    return this.memberships
      .map(({ organizationUnit: { acronym } }) => acronym)
      .filter((acronym) => acronym !== null)
  }

  get membershipSignatures(): string[] {
    return []
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

  /**
   * Identifiers to display in the UI. Returns the person's own identifiers
   * when present; otherwise falls back to the deduplicated identifiers of the
   * source-person records (deduplicated on type + value).
   */
  displayIdentifiers(): Array<PersonIdentifier | SourcePersonIdentifier> {
    if (this.identifiers.length > 0) {
      return this.identifiers
    }

    const seen = new Set<string>()
    const deduped: SourcePersonIdentifier[] = []
    for (const record of this.records) {
      for (const identifier of record.getIdentifiers()) {
        const key = `${identifier.type}:${identifier.value}`
        if (!seen.has(key)) {
          seen.add(key)
          deduped.push(identifier)
        }
      }
    }
    return deduped
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

  hasIdentifier(type: PersonIdentifierType): boolean {
    return this.identifiers.some((id) => id.type === type)
  }

  /**
   * Whether the identifier of the given type is authenticated. Derived, never
   * stored (see specs/872-refactor-account-edition-workflow/prompt.md): ORCID →
   * an OAuth grant exists; idHAL → a companion hal_login exists; every other
   * type (IdRef, …) is never authenticated.
   */
  isIdentifierAuthenticated(type: PersonIdentifierType): boolean {
    if (type === PersonIdentifierType.orcid) {
      const orcid = this.identifiers.find(
        (id) => id.type === PersonIdentifierType.orcid,
      )
      return orcid instanceof ORCIDIdentifier && !!orcid.oauth
    }
    if (
      type === PersonIdentifierType.idhals ||
      type === PersonIdentifierType.idhali
    ) {
      return this.hasIdentifier(PersonIdentifierType.hal_login)
    }
    return false
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
    const hydrated = new Person(
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
      person.records.map((record) => SourcePerson.fromDbSourcePerson(record)),
    )
    hydrated.employments =
      person.employments?.map((employment) =>
        PersonEmployment.fromDbPersonEmployment(employment),
      ) ?? []
    return hydrated
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
    const hydrated = new Person(
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
      json.records.map((record) => SourcePerson.fromJson(record)),
    )
    hydrated.employments = json.employments ?? []
    return hydrated
  }

  get authzProperties(): AuthorizationProperties {
    const rs =
      this.memberships
        ?.filter((m) => m.organizationUnit?.category === 'research_unit')
        .map((m) => m.organizationUnit?.uid)
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
