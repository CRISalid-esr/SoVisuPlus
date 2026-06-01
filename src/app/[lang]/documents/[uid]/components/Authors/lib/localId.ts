/** Stable client-side id for React keys / working-state identity. */
export function newLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID (older test runners).
  return `local-${Math.random().toString(36).slice(2)}-${Date.now()}`
}
