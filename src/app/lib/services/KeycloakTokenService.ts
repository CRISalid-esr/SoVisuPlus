import type { Account } from 'next-auth'
import { KeycloakSessionDAO } from '@/lib/daos/KeycloakSessionDAO'
import {
  accessTokenNeedsRefresh,
  nowSeconds,
  refreshKeycloakTokens,
  tokensFromResponse,
} from '@/app/auth/keycloakTokens'

/**
 * Keycloak tokens of the signed-in users, keyed on the Keycloak session id (`sid` claim of the
 * ID token) that the NextAuth JWT carries. Rows are encrypted at rest (field-encryption keyring).
 */
export class KeycloakTokenService {
  private readonly dao: KeycloakSessionDAO

  constructor(dao: KeycloakSessionDAO = new KeycloakSessionDAO()) {
    this.dao = dao
  }

  /** Keeps the tokens obtained at sign-in. Returns false when the account carries no usable pair. */
  public async storeSessionTokens(
    sid: string,
    account: Account,
    userId?: number,
  ): Promise<boolean> {
    const tokens = tokensFromResponse({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      refresh_expires_in:
        typeof account.refresh_expires_in === 'number'
          ? account.refresh_expires_in
          : undefined,
    })
    if (!tokens) {
      console.warn('[auth/keycloak] sign-in returned no usable token pair')
      return false
    }
    await this.dao.save(sid, tokens, userId)
    // Opportunistic sweep of the sessions whose refresh token expired.
    try {
      await this.dao.deleteExpired(nowSeconds())
    } catch (e) {
      console.warn('[auth/keycloak] expired sessions sweep failed:', e)
    }
    return true
  }

  /** Drops the tokens of a session (sign-out, or a refresh that failed). */
  public async forgetSessionTokens(sid: string): Promise<void> {
    try {
      await this.dao.delete(sid)
    } catch (e) {
      console.warn('[auth/keycloak] failed to drop the session tokens:', e)
    }
  }

  /**
   * The access token of a session, refreshed when it is about to expire (or when `forceRefresh`
   * is set, after the backend refused it as expiring). Null when the session is unknown or the
   * refresh failed: the person has to sign in again for the features needing the token.
   */
  public async getSessionAccessToken(
    sid: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<string | null> {
    const tokens = await this.dao.get(sid)
    if (!tokens) return null
    if (!options.forceRefresh && !accessTokenNeedsRefresh(tokens)) {
      return tokens.accessToken
    }
    const refreshed = await refreshKeycloakTokens(tokens)
    if (!refreshed) {
      await this.forgetSessionTokens(sid)
      return null
    }
    await this.dao.save(sid, refreshed)
    return refreshed.accessToken
  }
}
