import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { decryptString, encryptString } from '@/utils/crypto/fieldEncryption'
import { loadKeyringFromEnv } from '@/utils/crypto/keyring'
import type { KeycloakTokens } from '@/app/auth/keycloakTokens'

/**
 * Keycloak tokens of the signed-in users, one row per Keycloak session id (`sid`). The tokens
 * are encrypted at rest with the field-encryption keyring, bound (AAD) to the session id.
 */
export class KeycloakSessionDAO extends AbstractDAO {
  private static aad(sid: string): string {
    return `keycloakSession:sid=${sid}`
  }

  /** Creates or replaces the tokens of a session. */
  public async save(
    sid: string,
    tokens: KeycloakTokens,
    userId?: number,
  ): Promise<void> {
    const keyring = loadKeyringFromEnv()
    const aad = KeycloakSessionDAO.aad(sid)
    const data = {
      accessToken: encryptString(tokens.accessToken, keyring, { aad }),
      refreshToken: encryptString(tokens.refreshToken, keyring, { aad }),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    }
    await this.prismaClient.keycloakSession.upsert({
      where: { sid },
      update: userId === undefined ? data : { ...data, userId },
      create: { sid, userId: userId ?? null, ...data },
    })
  }

  /** The tokens of a session, or null when unknown. */
  public async get(sid: string): Promise<KeycloakTokens | null> {
    const row = await this.prismaClient.keycloakSession.findUnique({
      where: { sid },
    })
    if (!row) return null
    const keyring = loadKeyringFromEnv()
    const aad = KeycloakSessionDAO.aad(sid)
    return {
      accessToken: decryptString(row.accessToken, keyring, { aad }),
      refreshToken: decryptString(row.refreshToken, keyring, { aad }),
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt,
    }
  }

  public async delete(sid: string): Promise<void> {
    await this.prismaClient.keycloakSession.deleteMany({ where: { sid } })
  }

  /** Removes the rows whose refresh token expired before `now` (seconds since the epoch). */
  public async deleteExpired(now: number): Promise<number> {
    const result = await this.prismaClient.keycloakSession.deleteMany({
      where: { refreshTokenExpiresAt: { lt: now } },
    })
    return result.count
  }
}
