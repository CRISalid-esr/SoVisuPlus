import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto'

export type KeyId = string

export type Keyring = Readonly<{
  /** key id used to rotate keys */
  primaryKid: KeyId
  /** kid -> raw 32-byte key */
  keys: Readonly<Record<KeyId, Buffer>>
}>

export type EncryptOptions = Readonly<{
  /**
   * Optional authenticated associated data:
   * bind ciphertext to context (e.g. `orcidIdentifier:id=123`)
   */
  aad?: string
}>

const PREFIX = 'enc:v1:' as const

export class CryptoConfigError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'CryptoConfigError'
  }
}

export class CryptoDecryptError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'CryptoDecryptError'
  }
}

/**
 * Key must be 32 bytes (AES-256) provided as base64.
 */
export const parseBase64Key32 = (b64: string, label: string): Buffer => {
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) {
    throw new CryptoConfigError(
      `${label} must decode to 32 bytes; got ${key.length}`,
    )
  }
  return key
}

/**
 * Stored format:
 * enc:v1:<kid>:<ivB64>:<ctB64>:<tagB64>
 *
 * - iv: 12 bytes (recommended for GCM)
 * - tag: 16 bytes (default tag length in Node)
 */
export const encryptString = (
  plaintext: string,
  keyring: Keyring,
  opts: EncryptOptions = {},
): string => {
  if (!plaintext) return plaintext

  const key = keyring.keys[keyring.primaryKid]
  if (!key) {
    throw new CryptoConfigError(
      `Missing primary key for kid=${keyring.primaryKid}`,
    )
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  if (opts.aad) {
    cipher.setAAD(Buffer.from(opts.aad, 'utf8'))
  }

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  const ivB64 = iv.toString('base64')
  const ctB64 = ciphertext.toString('base64')
  const tagB64 = tag.toString('base64')

  return `${PREFIX}${keyring.primaryKid}:${ivB64}:${ctB64}:${tagB64}`
}

type ParsedEncrypted = Readonly<{
  kid: KeyId
  iv: Buffer
  ct: Buffer
  tag: Buffer
}>

const parseEncrypted = (value: string): ParsedEncrypted | null => {
  if (!value.startsWith(PREFIX)) return null
  const rest = value.slice(PREFIX.length)
  const parts = rest.split(':')
  if (parts.length !== 4) return null

  const [kid, ivB64, ctB64, tagB64] = parts
  if (!kid) return null

  try {
    return {
      kid,
      iv: Buffer.from(ivB64, 'base64'),
      ct: Buffer.from(ctB64, 'base64'),
      tag: Buffer.from(tagB64, 'base64'),
    }
  } catch {
    return null
  }
}

export const isEncryptedString = (value: string | null): boolean => {
  if (!value) return false
  return value.startsWith(PREFIX)
}

export const getKid = (value: string): string | null => {
  const parsed = parseEncrypted(value)
  return parsed ? parsed.kid : null
}

/**
 * Decrypts our enc:v1 format. If value is NOT encrypted, returns as-is (backward compatible).
 */
export const decryptString = (
  value: string,
  keyring: Keyring,
  opts: EncryptOptions = {},
): string => {
  if (!value) return value

  const parsed = parseEncrypted(value)
  if (!parsed) return value

  const key = keyring.keys[parsed.kid]
  if (!key) {
    throw new CryptoDecryptError(`No key available for kid=${parsed.kid}`)
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, parsed.iv)
    if (opts.aad) {
      decipher.setAAD(Buffer.from(opts.aad, 'utf8'))
    }
    decipher.setAuthTag(parsed.tag)

    const plaintext = Buffer.concat([
      decipher.update(parsed.ct),
      decipher.final(),
    ])
    return plaintext.toString('utf8')
  } catch {
    throw new CryptoDecryptError(
      `Failed to decrypt value for kid=${parsed.kid}`,
    )
  }
}
