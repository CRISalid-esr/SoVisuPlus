import type { JWT } from 'next-auth/jwt'

/**
 * Keycloak access-token lifecycle inside the NextAuth JWT.
 *
 * The JWT (encrypted session cookie) carries the access token, the refresh token and the access
 * token's expiry obtained at sign-in. The access token is forwarded as `Authorization: Bearer` to
 * the Crisalid Agents chat API, which refuses tokens with less than two minutes left, so the token
 * is refreshed ahead of its expiry (`REFRESH_AHEAD_SECONDS`). When the refresh fails (SSO session
 * idle-out or end, revocation), the tokens are dropped and `error` is set: the NextAuth session
 * itself is kept, only the features needing the access token degrade.
 */

export const REFRESH_AHEAD_SECONDS = 150

export const REFRESH_TOKEN_EXPIRED = 'RefreshTokenExpired'

export type KeycloakTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export const nowSeconds = (): number => Math.floor(Date.now() / 1000)

/** True when the access token expires in less than `REFRESH_AHEAD_SECONDS`. */
export const accessTokenNeedsRefresh = (
  token: JWT,
  now: number = nowSeconds(),
): boolean =>
  typeof token.accessTokenExpiresAt === 'number' &&
  token.accessTokenExpiresAt - now < REFRESH_AHEAD_SECONDS

const markRefreshTokenExpired = (token: JWT): JWT => {
  delete token.accessToken
  delete token.refreshToken
  delete token.accessTokenExpiresAt
  token.error = REFRESH_TOKEN_EXPIRED
  return token
}

/**
 * Exchanges the refresh token for a new access token at the Keycloak token endpoint and stores
 * the result in `token` (mutated and returned). The refresh token is replaced only when Keycloak
 * returns a new one (rotation is a realm setting). Any failure, HTTP or network, marks the token
 * with `error = 'RefreshTokenExpired'` and drops the three token fields.
 */
export const refreshKeycloakAccessToken = async (token: JWT): Promise<JWT> => {
  const issuer = process.env.KEYCLOAK_ISSUER
  const clientId = process.env.KEYCLOAK_CLIENT_ID
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET
  if (!token.refreshToken || !issuer || !clientId || !clientSecret) {
    return markRefreshTokenExpired(token)
  }
  try {
    const response = await fetch(
      `${issuer.replace(/\/+$/, '')}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
    )
    if (!response.ok) {
      console.warn(
        `[auth/keycloak] access token refresh refused (HTTP ${response.status})`,
      )
      return markRefreshTokenExpired(token)
    }
    const data = (await response.json()) as KeycloakTokenResponse
    if (!data.access_token || typeof data.expires_in !== 'number') {
      console.warn('[auth/keycloak] access token refresh returned no token')
      return markRefreshTokenExpired(token)
    }
    token.accessToken = data.access_token
    if (data.refresh_token) {
      token.refreshToken = data.refresh_token
    }
    token.accessTokenExpiresAt = nowSeconds() + data.expires_in
    delete token.error
    return token
  } catch (e) {
    console.warn('[auth/keycloak] access token refresh failed:', e)
    return markRefreshTokenExpired(token)
  }
}

/** Refreshes the access token only when it is about to expire. */
export const refreshKeycloakAccessTokenIfNeeded = async (
  token: JWT,
  now: number = nowSeconds(),
): Promise<JWT> =>
  accessTokenNeedsRefresh(token, now)
    ? refreshKeycloakAccessToken(token)
    : token
