import {
  PersonIdentifier,
  PersonIdentifierJson,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

import { PersonIdentifierWithRelations as DBPersonIdentifier } from '@/prisma-schema/extended-client'

export type OrcidScope =
  | '/read-limited'
  | '/person/update'
  | '/activities/update'
  | '/authenticate'

export type OrcidIdentifierJson = {
  scope: OrcidScope[]
  tokenType?: string | null
  obtainedAt: string | Date
  expiresAt: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

export type ORCIDIdentifierJson = PersonIdentifierJson & {
  oauth?: OrcidIdentifierJson | null
}

export type OrcidOAuthData = {
  accessToken?: string | null
  refreshToken?: string | null
  scope: OrcidScope[]
  tokenType?: string | null
  obtainedAt: Date
  expiresAt: Date
  createdAt?: Date | null
  updatedAt?: Date | null
}

export class ORCIDIdentifier extends PersonIdentifier {
  public oauth?: OrcidOAuthData

  constructor(orcid: string, oauth?: OrcidOAuthData) {
    super(PersonIdentifierType.ORCID, ORCIDIdentifier.normalize(orcid))
    this.oauth = oauth
  }

  static normalize(v: string): string {
    const trimmed = v.trim()
    // remove leading FQDN if present
    return trimmed.replace(/^https?:\/\/orcid\.org\//i, '')
  }

  static isOrcidScope(scope: string): scope is OrcidScope {
    const validScopes: OrcidScope[] = [
      '/read-limited',
      '/person/update',
      '/activities/update',
      '/authenticate',
    ]
    return validScopes.includes(scope as OrcidScope)
  }

  static isOrcidIdentifierJson(
    identifier: PersonIdentifierJson | ORCIDIdentifierJson,
  ): identifier is PersonIdentifierJson & {
    oauth: NonNullable<ORCIDIdentifierJson['oauth']>
  } {
    return (
      identifier.type === PersonIdentifierType.ORCID &&
      'oauth' in identifier &&
      identifier.oauth !== null
    )
  }

  static isDbOrcidIdentifier(
    identifier: DBPersonIdentifier,
  ): identifier is DBPersonIdentifier & {
    orcidIdentifier: NonNullable<DBPersonIdentifier['orcidIdentifier']>
  } {
    return (
      identifier.type === PersonIdentifierType.ORCID &&
      'orcidIdentifier' in identifier &&
      identifier.orcidIdentifier !== null
    )
  }

  static parseOrcidScope(scope: string): OrcidScope[] {
    const parts = scope
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const scopes: OrcidScope[] = []
    for (const part of parts) {
      if (ORCIDIdentifier.isOrcidScope(part)) {
        scopes.push(part)
      } else {
        console.warn(`Unknown ORCID scope encountered: ${part}`)
      }
    }
    return scopes
  }

  static fromJson(json: ORCIDIdentifierJson): ORCIDIdentifier {
    const type =
      typeof json.type === 'string'
        ? PersonIdentifier.typeFromString(json.type)
        : json.type

    if (type !== PersonIdentifierType.ORCID) {
      throw new Error(`ORCIDIdentifier.fromJson called with type=${type}`)
    }

    const ext = json.oauth
    const scopeStr = ext?.scope ?? null

    return new ORCIDIdentifier(json.value, {
      tokenType: ext!.tokenType ?? null,
      scope: ext!.scope,
      obtainedAt: new Date(ext!.obtainedAt),
      expiresAt: new Date(ext!.expiresAt),
      createdAt: new Date(ext!.createdAt),
      updatedAt: new Date(ext!.updatedAt),
    })
  }

  static fromDB(
    identifier: Omit<DBPersonIdentifier, 'id' | 'personId'>,
  ): ORCIDIdentifier {
    if (identifier.type !== PersonIdentifierType.ORCID) {
      throw new Error(
        `ORCIDIdentifier.fromDB called with type=${identifier.type}`,
      )
    }
    if (!('orcidIdentifier' in identifier) || !identifier.orcidIdentifier) {
      throw new Error(
        'ORCIDIdentifier.fromDB called but no orcidIdentifier data present',
      )
    }

    const scopeStr = identifier.orcidIdentifier.scope
    return new ORCIDIdentifier(identifier.value, {
      tokenType: identifier.orcidIdentifier.tokenType ?? null,
      scope: ORCIDIdentifier.parseOrcidScope(scopeStr),
      obtainedAt: identifier.orcidIdentifier.obtainedAt,
      expiresAt: identifier.orcidIdentifier.expiresAt,
      createdAt: identifier.orcidIdentifier.createdAt,
      updatedAt: identifier.orcidIdentifier.updatedAt,
    })
  }
}
