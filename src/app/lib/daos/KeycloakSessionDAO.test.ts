import { PrismaClient } from '@prisma/client'
import { KeycloakSessionDAO } from '@/lib/daos/KeycloakSessionDAO'
import { isEncryptedString } from '@/utils/crypto/fieldEncryption'

jest.mock('@prisma/client', () => {
  const actualPrismaClient: PrismaClient = jest.requireActual('@prisma/client')
  const mockPrismaClient = {
    keycloakSession: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  }
  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})
const mockPrisma = new PrismaClient()

const TOKENS = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiresAt: 1_700_000_900,
  refreshTokenExpiresAt: 1_700_001_800,
}

describe('KeycloakSessionDAO', () => {
  let dao: KeycloakSessionDAO

  beforeAll(() => {
    process.env.FIELD_ENC_PRIMARY_KID = 'k2026_02'
    process.env.FIELD_ENC_KEYS_JSON = JSON.stringify({
      k2026_02: Buffer.alloc(32, 7).toString('base64'),
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    dao = new KeycloakSessionDAO()
  })

  it('upserts the row with encrypted tokens', async () => {
    await dao.save('sid-1', TOKENS, 42)

    const arg = (mockPrisma.keycloakSession.upsert as jest.Mock).mock
      .calls[0][0]
    expect(arg.where).toEqual({ sid: 'sid-1' })
    expect(arg.create.sid).toBe('sid-1')
    expect(arg.create.userId).toBe(42)
    expect(arg.update.userId).toBe(42)
    expect(isEncryptedString(arg.create.accessToken)).toBe(true)
    expect(isEncryptedString(arg.create.refreshToken)).toBe(true)
    expect(arg.create.accessToken).not.toContain('access-1')
    expect(arg.create.accessTokenExpiresAt).toBe(TOKENS.accessTokenExpiresAt)
    expect(arg.create.refreshTokenExpiresAt).toBe(TOKENS.refreshTokenExpiresAt)
  })

  it('leaves the user id untouched on a refresh', async () => {
    await dao.save('sid-1', TOKENS)

    const arg = (mockPrisma.keycloakSession.upsert as jest.Mock).mock
      .calls[0][0]
    expect(arg.update).not.toHaveProperty('userId')
    expect(arg.create.userId).toBeNull()
  })

  it('decrypts the tokens it stored', async () => {
    await dao.save('sid-1', TOKENS)
    const stored = (mockPrisma.keycloakSession.upsert as jest.Mock).mock
      .calls[0][0].create
    ;(mockPrisma.keycloakSession.findUnique as jest.Mock).mockResolvedValue(
      stored,
    )

    expect(await dao.get('sid-1')).toEqual(TOKENS)
  })

  it('refuses a row re-keyed to another session', async () => {
    await dao.save('sid-1', TOKENS)
    const stored = (mockPrisma.keycloakSession.upsert as jest.Mock).mock
      .calls[0][0].create
    ;(mockPrisma.keycloakSession.findUnique as jest.Mock).mockResolvedValue({
      ...stored,
      sid: 'sid-2',
    })

    await expect(dao.get('sid-2')).rejects.toThrow()
  })

  it('is null for an unknown session', async () => {
    ;(mockPrisma.keycloakSession.findUnique as jest.Mock).mockResolvedValue(
      null,
    )

    expect(await dao.get('nope')).toBeNull()
  })

  it('deletes one session and the expired ones', async () => {
    ;(mockPrisma.keycloakSession.deleteMany as jest.Mock).mockResolvedValue({
      count: 3,
    })

    await dao.delete('sid-1')
    expect(mockPrisma.keycloakSession.deleteMany).toHaveBeenCalledWith({
      where: { sid: 'sid-1' },
    })

    expect(await dao.deleteExpired(1_700_000_000)).toBe(3)
    expect(mockPrisma.keycloakSession.deleteMany).toHaveBeenLastCalledWith({
      where: { refreshTokenExpiresAt: { lt: 1_700_000_000 } },
    })
  })
})
