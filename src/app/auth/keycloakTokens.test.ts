/**
 * @jest-environment node
 */
import type { JWT } from 'next-auth/jwt'
import {
  accessTokenNeedsRefresh,
  refreshKeycloakAccessToken,
  refreshKeycloakAccessTokenIfNeeded,
} from '@/app/auth/keycloakTokens'

const NOW = 1_700_000_000

const makeToken = (overrides: Partial<JWT> = {}): JWT => ({
  username: 'jdupont',
  accessToken: 'access-old',
  refreshToken: 'refresh-old',
  accessTokenExpiresAt: NOW + 60,
  ...overrides,
})

const tokenResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const ORIGINAL_FETCH = global.fetch

describe('keycloakTokens', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000)
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    process.env = {
      ...OLD_ENV,
      KEYCLOAK_ISSUER: 'https://keycloak.test/realms/crisalid/',
      KEYCLOAK_CLIENT_ID: 'sovisuplus',
      KEYCLOAK_CLIENT_SECRET: 'client-secret',
    }
  })

  afterEach(() => {
    process.env = OLD_ENV
    global.fetch = ORIGINAL_FETCH
    jest.restoreAllMocks()
  })

  describe('accessTokenNeedsRefresh', () => {
    it('is true when less than 150 s remain', () => {
      expect(
        accessTokenNeedsRefresh(makeToken({ accessTokenExpiresAt: NOW + 149 })),
      ).toBe(true)
      expect(
        accessTokenNeedsRefresh(makeToken({ accessTokenExpiresAt: NOW - 10 })),
      ).toBe(true)
    })

    it('is false when 150 s or more remain', () => {
      expect(
        accessTokenNeedsRefresh(makeToken({ accessTokenExpiresAt: NOW + 150 })),
      ).toBe(false)
      expect(
        accessTokenNeedsRefresh(makeToken({ accessTokenExpiresAt: NOW + 900 })),
      ).toBe(false)
    })

    it('is false without an expiry (no Keycloak tokens in the JWT)', () => {
      expect(
        accessTokenNeedsRefresh(makeToken({ accessTokenExpiresAt: undefined })),
      ).toBe(false)
    })
  })

  describe('refreshKeycloakAccessToken', () => {
    it('posts a refresh_token grant to the realm token endpoint', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        tokenResponse({
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_in: 900,
        }),
      ) as jest.Mock

      await refreshKeycloakAccessToken(makeToken())

      const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toBe(
        'https://keycloak.test/realms/crisalid/protocol/openid-connect/token',
      )
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded',
      )
      expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
        grant_type: 'refresh_token',
        refresh_token: 'refresh-old',
        client_id: 'sovisuplus',
        client_secret: 'client-secret',
      })
    })

    it('stores the rotated pair and the new expiry', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        tokenResponse({
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_in: 900,
        }),
      ) as jest.Mock
      const token = makeToken({ error: 'RefreshTokenExpired' })

      const result = await refreshKeycloakAccessToken(token)

      expect(result).toBe(token)
      expect(token.accessToken).toBe('access-new')
      expect(token.refreshToken).toBe('refresh-new')
      expect(token.accessTokenExpiresAt).toBe(NOW + 900)
      expect(token.error).toBeUndefined()
      // Unrelated claims are untouched.
      expect(token.username).toBe('jdupont')
    })

    it('keeps the previous refresh token when none is returned', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          tokenResponse({ access_token: 'access-new', expires_in: 300 }),
        ) as jest.Mock
      const token = makeToken()

      await refreshKeycloakAccessToken(token)

      expect(token.accessToken).toBe('access-new')
      expect(token.refreshToken).toBe('refresh-old')
      expect(token.accessTokenExpiresAt).toBe(NOW + 300)
    })

    it('marks the token expired and drops the tokens on an HTTP error', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          tokenResponse(
            { error: 'invalid_grant', error_description: 'Session not active' },
            400,
          ),
        ) as jest.Mock
      const token = makeToken()

      await refreshKeycloakAccessToken(token)

      expect(token.error).toBe('RefreshTokenExpired')
      expect(token).not.toHaveProperty('accessToken')
      expect(token).not.toHaveProperty('refreshToken')
      expect(token).not.toHaveProperty('accessTokenExpiresAt')
      // The NextAuth session itself is kept: the other claims survive.
      expect(token.username).toBe('jdupont')
    })

    it('marks the token expired and drops the tokens on a network error', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new TypeError('fetch failed')) as jest.Mock
      const token = makeToken()

      await refreshKeycloakAccessToken(token)

      expect(token.error).toBe('RefreshTokenExpired')
      expect(token.accessToken).toBeUndefined()
      expect(token.refreshToken).toBeUndefined()
    })

    it('marks the token expired without a refresh token to present', async () => {
      global.fetch = jest.fn() as jest.Mock
      const token = makeToken({ refreshToken: undefined })

      await refreshKeycloakAccessToken(token)

      expect(global.fetch).not.toHaveBeenCalled()
      expect(token.error).toBe('RefreshTokenExpired')
      expect(token.accessToken).toBeUndefined()
    })
  })

  describe('refreshKeycloakAccessTokenIfNeeded', () => {
    it('does not call Keycloak when the access token is far from expiry', async () => {
      global.fetch = jest.fn() as jest.Mock
      const token = makeToken({ accessTokenExpiresAt: NOW + 600 })

      const result = await refreshKeycloakAccessTokenIfNeeded(token)

      expect(result).toBe(token)
      expect(global.fetch).not.toHaveBeenCalled()
      expect(token.accessToken).toBe('access-old')
      expect(token.error).toBeUndefined()
    })

    it('refreshes when the access token is about to expire', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          tokenResponse({ access_token: 'access-new', expires_in: 900 }),
        ) as jest.Mock
      const token = makeToken({ accessTokenExpiresAt: NOW + 100 })

      await refreshKeycloakAccessTokenIfNeeded(token)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(token.accessToken).toBe('access-new')
    })
  })
})
