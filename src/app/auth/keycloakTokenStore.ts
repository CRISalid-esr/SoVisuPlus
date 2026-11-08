import type { Account } from 'next-auth'
import { KeycloakSessionDAO } from '@/lib/daos/KeycloakSessionDAO'
import {
  accessTokenNeedsRefresh,
  nowSeconds,
  refreshKeycloakTokens,
  tokensFromResponse,
} from '@/app/auth/keycloakTokens'

/**
 * Store of the Keycloak tokens, keyed on the Keycloak session id (`sid` claim of the ID token)
 * that the NextAuth JWT carries. The rows are encrypted at rest (field-encryption keyring).
 */

/** Keeps the tokens obtained at sign-in. Returns false when the account carries no usable pair. */
export const storeSessionTokens = async (
  sid: string,
  account: Account,
  userId?: number,
): Promise<boolean> => {
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
  const dao = new KeycloakSessionDAO()
  await dao.save(sid, tokens, userId)
  // Opportunistic sweep of the sessions whose refresh token expired.
  try {
    await dao.deleteExpired(nowSeconds())
  } catch (e) {
    console.warn('[auth/keycloak] expired sessions sweep failed:', e)
  }
  return true
}

/** Drops the tokens of a session (sign-out, or a refresh that failed). */
export const forgetSessionTokens = async (sid: string): Promise<void> => {
  try {
    await new KeycloakSessionDAO().delete(sid)
  } catch (e) {
    console.warn('[auth/keycloak] failed to drop the session tokens:', e)
  }
}

/**
 * The access token of a session, refreshed when it is about to expire (or when `forceRefresh`
 * is set, after the backend refused it as expiring). Null when the session is unknown or the
 * refresh failed: the person has to sign in again for the features needing the token.
 */
export const getSessionAccessToken = async (
  sid: string,
  options: { forceRefresh?: boolean } = {},
): Promise<string | null> => {
  const dao = new KeycloakSessionDAO()
  const tokens = await dao.get(sid)
  if (!tokens) return null
  if (!options.forceRefresh && !accessTokenNeedsRefresh(tokens)) {
    return tokens.accessToken
  }
  const refreshed = await refreshKeycloakTokens(tokens)
  if (!refreshed) {
    await forgetSessionTokens(sid)
    return null
  }
  await dao.save(sid, refreshed)
  return refreshed.accessToken
}
