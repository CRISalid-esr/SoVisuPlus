import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { WorkingIdentifier, WorkingIdentifierType } from './types'

// Built from the Prisma enum, so it always covers exactly the known types.
const KNOWN_IDENTIFIER_TYPES = new Set<string>(
  Object.values(PersonIdentifierType),
)

/**
 * The single validation/normalization point for identifier types entering the
 * working model from untyped sources (domain identifiers, JSON, HAL payloads).
 * Trims and lower-cases the raw value and returns it only if it is a known
 * `WorkingIdentifierType`; otherwise returns null.
 */
export function normalizeIdentifierType(
  raw: string,
): WorkingIdentifierType | null {
  const normalized = raw.trim().toLowerCase()
  return KNOWN_IDENTIFIER_TYPES.has(normalized)
    ? (normalized as WorkingIdentifierType)
    : null
}

/**
 * Map raw `{ type, value }` pairs to typed `WorkingIdentifier`s, dropping any
 * entry whose type is not recognised. Use this wherever identifiers are read in.
 */
export function toWorkingIdentifiers(
  raw: ReadonlyArray<{ type: string; value: string }>,
): WorkingIdentifier[] {
  return raw.flatMap(({ type, value }) => {
    const normalized = normalizeIdentifierType(type)
    return normalized ? [{ type: normalized, value }] : []
  })
}
