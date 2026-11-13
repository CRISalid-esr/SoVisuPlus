/**
 * Keycloak token pairs: parsing of the token endpoint responses and refresh. The access token is
 * forwarded as `Authorization: Bearer` to the Crisalid Agents chat API, which refuses tokens with
 * less than two minutes left, so it is refreshed ahead of its expiry (`REFRESH_AHEAD_SECONDS`). A
 * refresh fails when the SSO session idled out or ended, or when the tokens were revoked: the
 * caller then drops the pair, the NextAuth session itself is kept.
 */

export const REFRESH_AHEAD_SECONDS = 150

/** Lifetime assumed for a refresh token when Keycloak does not say (seconds). */
export const DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS = 30 * 60

export type KeycloakTokens = {
  accessToken: string
  refreshToken: string
  /** Access token expiry, seconds since the epoch. */
  accessTokenExpiresAt: number
  /** Refresh token expiry, seconds since the epoch. */
  refreshTokenExpiresAt: number
}

export type KeycloakTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  refresh_expires_in?: number
}

export const nowSeconds = (): number => Math.floor(Date.now() / 1000)

/** True when the access token expires in less than `REFRESH_AHEAD_SECONDS`. */
export const accessTokenNeedsRefresh = (
  tokens: Pick<KeycloakTokens, 'accessTokenExpiresAt'>,
  now: number = nowSeconds(),
): boolean => tokens.accessTokenExpiresAt - now < REFRESH_AHEAD_SECONDS

/**
 * The token pair of a token endpoint response (sign-in or refresh), or null when the response
 * carries no usable access token. `previous` supplies the refresh token when the response
 * rotates none (rotation is a realm setting).
 */
export const tokensFromResponse = (
  data: KeycloakTokenResponse & { expires_at?: number },
  previous?: Pick<KeycloakTokens, 'refreshToken' | 'refreshTokenExpiresAt'>,
  now: number = nowSeconds(),
): KeycloakTokens | null => {
  const refreshToken = data.refresh_token ?? previous?.refreshToken
  const accessTokenExpiresAt =
    typeof data.expires_at === 'number'
      ? data.expires_at
      : typeof data.expires_in === 'number'
        ? now + data.expires_in
        : undefined
  if (
    !data.access_token ||
    !refreshToken ||
    accessTokenExpiresAt === undefined
  ) {
    return null
  }
  const refreshTokenExpiresAt =
    typeof data.refresh_expires_in === 'number' && data.refresh_expires_in > 0
      ? now + data.refresh_expires_in
      : (previous?.refreshTokenExpiresAt ??
        now + DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS)
  return {
    accessToken: data.access_token,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  }
}

/**
 * Exchanges the refresh token for a new access token at the Keycloak token endpoint. Returns the
 * new pair, or null on any failure (HTTP or network): the caller must then forget the tokens.
 */
export const refreshKeycloakTokens = async (
  tokens: KeycloakTokens,
): Promise<KeycloakTokens | null> => {
  const issuer = process.env.KEYCLOAK_ISSUER
  const clientId = process.env.KEYCLOAK_CLIENT_ID
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET
  if (!tokens.refreshToken || !issuer || !clientId || !clientSecret) {
    return null
  }
  try {
    const response = await fetch(
      `${issuer.replace(/\/+$/, '')}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
    )
    if (!response.ok) {
      console.warn(
        `[auth/keycloak] access token refresh refused (HTTP ${response.status})`,
      )
      return null
    }
    const data = (await response.json()) as KeycloakTokenResponse
    const refreshed = tokensFromResponse(data, tokens)
    if (!refreshed) {
      console.warn('[auth/keycloak] access token refresh returned no token')
    }
    return refreshed
  } catch (e) {
    console.warn('[auth/keycloak] access token refresh failed:', e)
    return null
  }
}
