import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

export type OrcidScope =
  | '/read-limited'
  | '/person/update'
  | '/activities/update'
  | '/authenticate'

export type OrcidOAuthData = {
  accessToken?: string | null
  refreshToken?: string | null
  scope?: OrcidScope[] | null
  tokenType?: string | null
  obtainedAt: Date
  expiresAt: Date
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
}
