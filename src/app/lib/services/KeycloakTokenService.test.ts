/**
 * @jest-environment node
 */
import { KeycloakSessionDAO } from '@/lib/daos/KeycloakSessionDAO'
import { refreshKeycloakTokens } from '@/app/auth/keycloakTokens'
import { KeycloakTokenService } from '@/lib/services/KeycloakTokenService'

jest.mock('@/app/auth/keycloakTokens', () => ({
  ...jest.requireActual('@/app/auth/keycloakTokens'),
  refreshKeycloakTokens: jest.fn(),
}))

const NOW = 1_700_000_000
const mockRefresh = refreshKeycloakTokens as jest.Mock

const storedTokens = (accessTokenExpiresAt = NOW + 900) => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiresAt,
  refreshTokenExpiresAt: NOW + 1800,
})

const signInAccount = {
  provider: 'keycloak',
  type: 'oauth' as const,
  providerAccountId: 'u1',
  access_token: 'a',
  refresh_token: 'r',
  expires_at: NOW + 900,
  refresh_expires_in: 1800,
}

describe('KeycloakTokenService', () => {
  let dao: jest.Mocked<KeycloakSessionDAO>
  let service: KeycloakTokenService

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000)
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    dao = {
      save: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteExpired: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<KeycloakSessionDAO>
    service = new KeycloakTokenService(dao)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('storeSessionTokens', () => {
    it('saves the sign-in token pair under the session id and sweeps expired rows', async () => {
      expect(await service.storeSessionTokens('sid-1', signInAccount)).toBe(
        true,
      )
      expect(dao.save).toHaveBeenCalledWith(
        'sid-1',
        {
          accessToken: 'a',
          refreshToken: 'r',
          accessTokenExpiresAt: NOW + 900,
          refreshTokenExpiresAt: NOW + 1800,
        },
        undefined,
      )
      expect(dao.deleteExpired).toHaveBeenCalledWith(NOW)
    })

    it('stores nothing when the account carries no usable pair', async () => {
      expect(
        await service.storeSessionTokens('sid-1', {
          provider: 'keycloak',
          type: 'oauth',
          providerAccountId: 'u1',
        }),
      ).toBe(false)
      expect(dao.save).not.toHaveBeenCalled()
    })

    it('survives a failing sweep', async () => {
      dao.deleteExpired.mockRejectedValue(new Error('db down'))

      await expect(
        service.storeSessionTokens('sid-1', signInAccount),
      ).resolves.toBe(true)
    })
  })

  describe('getSessionAccessToken', () => {
    it('returns the stored access token when it is far from expiry', async () => {
      dao.get.mockResolvedValue(storedTokens())

      expect(await service.getSessionAccessToken('sid-1')).toBe('access-1')
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(dao.save).not.toHaveBeenCalled()
    })

    it('is null for an unknown session', async () => {
      dao.get.mockResolvedValue(null)

      expect(await service.getSessionAccessToken('sid-1')).toBeNull()
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('refreshes and saves the pair when the access token is about to expire', async () => {
      dao.get.mockResolvedValue(storedTokens(NOW + 60))
      const refreshed = { ...storedTokens(NOW + 900), accessToken: 'access-2' }
      mockRefresh.mockResolvedValue(refreshed)

      expect(await service.getSessionAccessToken('sid-1')).toBe('access-2')
      expect(mockRefresh).toHaveBeenCalledWith(storedTokens(NOW + 60))
      expect(dao.save).toHaveBeenCalledWith('sid-1', refreshed)
    })

    it('refreshes on demand even when the token is not about to expire', async () => {
      dao.get.mockResolvedValue(storedTokens())
      mockRefresh.mockResolvedValue({
        ...storedTokens(),
        accessToken: 'access-2',
      })

      expect(
        await service.getSessionAccessToken('sid-1', { forceRefresh: true }),
      ).toBe('access-2')
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('forgets the session and is null when the refresh fails', async () => {
      dao.get.mockResolvedValue(storedTokens(NOW + 60))
      mockRefresh.mockResolvedValue(null)

      expect(await service.getSessionAccessToken('sid-1')).toBeNull()
      expect(dao.delete).toHaveBeenCalledWith('sid-1')
      expect(dao.save).not.toHaveBeenCalled()
    })
  })

  describe('forgetSessionTokens', () => {
    it('deletes the row and swallows database errors', async () => {
      await service.forgetSessionTokens('sid-1')
      expect(dao.delete).toHaveBeenCalledWith('sid-1')

      dao.delete.mockRejectedValue(new Error('db down'))
      await expect(
        service.forgetSessionTokens('sid-1'),
      ).resolves.toBeUndefined()
    })
  })
})
