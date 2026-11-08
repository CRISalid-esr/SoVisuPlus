/**
 * @jest-environment node
 */
import {
  accessTokenNeedsRefresh,
  DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS,
  KeycloakTokens,
  refreshKeycloakTokens,
  tokensFromResponse,
} from '@/app/auth/keycloakTokens'

const NOW = 1_700_000_000

const makeTokens = (
  overrides: Partial<KeycloakTokens> = {},
): KeycloakTokens => ({
  accessToken: 'access-old',
  refreshToken: 'refresh-old',
  accessTokenExpiresAt: NOW + 60,
  refreshTokenExpiresAt: NOW + 1800,
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
        accessTokenNeedsRefresh(
          makeTokens({ accessTokenExpiresAt: NOW + 149 }),
        ),
      ).toBe(true)
      expect(
        accessTokenNeedsRefresh(makeTokens({ accessTokenExpiresAt: NOW - 10 })),
      ).toBe(true)
    })

    it('is false when 150 s or more remain', () => {
      expect(
        accessTokenNeedsRefresh(
          makeTokens({ accessTokenExpiresAt: NOW + 150 }),
        ),
      ).toBe(false)
      expect(
        accessTokenNeedsRefresh(
          makeTokens({ accessTokenExpiresAt: NOW + 900 }),
        ),
      ).toBe(false)
    })
  })

  describe('tokensFromResponse', () => {
    it('reads a sign-in token set (expires_at and refresh_expires_in)', () => {
      expect(
        tokensFromResponse({
          access_token: 'a',
          refresh_token: 'r',
          expires_at: NOW + 900,
          refresh_expires_in: 1800,
        }),
      ).toEqual({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: NOW + 900,
        refreshTokenExpiresAt: NOW + 1800,
      })
    })

    it('reads a refresh response (expires_in) and keeps the previous refresh token when none is rotated', () => {
      expect(
        tokensFromResponse(
          { access_token: 'a2', expires_in: 900 },
          makeTokens(),
        ),
      ).toEqual({
        accessToken: 'a2',
        refreshToken: 'refresh-old',
        accessTokenExpiresAt: NOW + 900,
        refreshTokenExpiresAt: NOW + 1800,
      })
    })

    it('assumes a default refresh token lifetime when Keycloak gives none', () => {
      expect(
        tokensFromResponse({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 300,
        })?.refreshTokenExpiresAt,
      ).toBe(NOW + DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS)
    })

    it('is null without an access token, a refresh token or an expiry', () => {
      expect(
        tokensFromResponse({ refresh_token: 'r', expires_in: 1 }),
      ).toBeNull()
      expect(
        tokensFromResponse({ access_token: 'a', expires_in: 1 }),
      ).toBeNull()
      expect(
        tokensFromResponse({ access_token: 'a', refresh_token: 'r' }),
      ).toBeNull()
    })
  })

  describe('refreshKeycloakTokens', () => {
    it('posts a refresh_token grant to the realm token endpoint', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          tokenResponse({ access_token: 'access-new', expires_in: 900 }),
        ) as jest.Mock

      await refreshKeycloakTokens(makeTokens())

      expect(global.fetch).toHaveBeenCalledTimes(1)
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

    it('returns the rotated pair with the new expiries', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        tokenResponse({
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_in: 900,
          refresh_expires_in: 1800,
        }),
      ) as jest.Mock

      expect(await refreshKeycloakTokens(makeTokens())).toEqual({
        accessToken: 'access-new',
        refreshToken: 'refresh-new',
        accessTokenExpiresAt: NOW + 900,
        refreshTokenExpiresAt: NOW + 1800,
      })
    })

    it('is null on an HTTP error', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          tokenResponse({ error: 'invalid_grant' }, 400),
        ) as jest.Mock

      expect(await refreshKeycloakTokens(makeTokens())).toBeNull()
    })

    it('is null on a network error', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED')) as jest.Mock

      expect(await refreshKeycloakTokens(makeTokens())).toBeNull()
    })

    it('is null without a refresh token to present', async () => {
      global.fetch = jest.fn() as jest.Mock

      expect(
        await refreshKeycloakTokens(makeTokens({ refreshToken: '' })),
      ).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('is null when the response carries no access token', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(tokenResponse({ expires_in: 900 })) as jest.Mock

      expect(await refreshKeycloakTokens(makeTokens())).toBeNull()
    })
  })
})
