import { CryptoConfigError, Keyring, parseBase64Key32 } from './fieldEncryption'

type KeysJson = Readonly<Record<string, string>>

export const loadKeyringFromEnv = (): Keyring => {
  const primaryKid = process.env.FIELD_ENC_PRIMARY_KID
  const keysJsonStr = process.env.FIELD_ENC_KEYS_JSON

  if (!primaryKid) {
    throw new CryptoConfigError('Missing env FIELD_ENC_PRIMARY_KID')
  }
  if (!keysJsonStr) {
    throw new CryptoConfigError('Missing env FIELD_ENC_KEYS_JSON')
  }

  let parsed: KeysJson
  try {
    parsed = JSON.parse(keysJsonStr) as KeysJson
  } catch {
    throw new CryptoConfigError('FIELD_ENC_KEYS_JSON is not valid JSON')
  }

  const keys: Record<string, Buffer> = {}
  for (const [kid, b64] of Object.entries(parsed)) {
    keys[kid] = parseBase64Key32(b64, `FIELD_ENC_KEYS_JSON[${kid}]`)
  }

  if (!keys[primaryKid]) {
    throw new CryptoConfigError(
      `primary kid ${primaryKid} not found in FIELD_ENC_KEYS_JSON`,
    )
  }

  return { primaryKid, keys }
}
