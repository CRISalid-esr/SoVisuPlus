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
import {
  PersonIdentifier as DbPersonIdentifier,
  SourcePersonIdentifierType,
} from '@prisma/client'
import { PersonMembership } from '@/types/PersonMembership'
import { PersonEmployment } from '@/types/PersonEmployment'
import { SourcePerson, SourcePersonJson } from '@/types/SourcePerson'
import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'
import { normalizeSearchText } from '@/utils/fuzzySearch/fuzzySearch'
import { Authorizable, AuthorizationProperties } from '@/types/authorizable'
import { organizationPerimeterFromMemberships } from '@/types/organizationScopes'
import type { Document } from '@/types/Document'

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
  /**
   * Uids of organization units whose affiliation edges could not be hydrated
   * (undeterminable category). They are missing from memberships/employments
   * but the graph still asserts them, so they must count toward the keep-set
   * when affiliations are replaced rather than upserted.
   */
  public unhydratedMembershipOrgUids: string[] = []
  public unhydratedEmploymentOrgUids: string[] = []

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
    this.normalizedName = normalizeSearchText(this.displayNameGuard())
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
   * when present; otherwise falls back to the identifiers of the person's
   * source-person records that contribute to a record of the given document.
   * A type whose source persons disagree (several distinct values) is left out,
   * and an idhali is left out as soon as a source person carries an idhals.
   */
  displayIdentifiers(
    document: Document,
  ): Array<PersonIdentifier | SourcePersonIdentifier> {
    if (this.identifiers.length > 0) {
      return this.identifiers
    }

    const sourcePersonUids = new Set(this.records.map((record) => record.uid))
    const identifiersByType = new Map<
      string,
      Map<string, SourcePersonIdentifier>
    >()
    for (const record of document.records) {
      for (const contribution of record.contributions) {
        if (!sourcePersonUids.has(contribution.person.uid)) continue
        for (const identifier of contribution.person.getIdentifiers()) {
          const value = identifier.value.trim().toLowerCase()
          if (!value) continue
          const identifiers =
            identifiersByType.get(identifier.type) ?? new Map()
          if (!identifiers.has(value)) identifiers.set(value, identifier)
          identifiersByType.set(identifier.type, identifiers)
        }
      }
    }

    const resolved: SourcePersonIdentifier[] = []
    for (const identifiers of identifiersByType.values()) {
      if (identifiers.size === 1) resolved.push(...identifiers.values())
    }
    // The idhals is safer and better suited to the HAL deposit than the idhali,
    // so the idhali is only kept when no source person carries an idhals.
    return identifiersByType.has(SourcePersonIdentifierType.idhals)
      ? resolved.filter(
          (identifier) => identifier.type !== SourcePersonIdentifierType.idhali,
        )
      : resolved
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

  /**
   * Whether the identifier of the given type is validated. Authentication
   * implies validation, so an authenticated identifier is always validated.
   */
  isIdentifierValidated(type: PersonIdentifierType): boolean {
    const identifier = this.identifiers.find((id) => id.type === type)
    if (!identifier) return false
    return identifier.validated || this.isIdentifierAuthenticated(type)
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
        validated: x.validated,
        orcidIdentifier: x.orcidIdentifier,
      })
    }

    return PersonIdentifier.fromDB({
      type: x.type,
      value: x.value,
      validated: x.validated,
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
    return {
      __type: 'Person',
      perimeter: {
        Person: [this.uid],
        ...organizationPerimeterFromMemberships(this.memberships),
      },
    }
  }
}

const isPerson = (agent: IAgent | null | undefined): agent is Person =>
  !!agent && agent.type === 'person'

export { Person, isPerson }
export type { PersonJson }
