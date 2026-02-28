/**
 * Parse an env var that must be a JSON array of strings.
 *
 * Example:
 *   PUBLICATION_LIST_ROLES_FILTER='["author","author of introduction, etc."]'
 *
 * Invalid, missing, or non-array values return [].
 */
export function parseStrArrayEnvVar(raw?: string): string[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.map((v) => String(v).trim()).filter(Boolean)
  } catch {
    return []
  }
}
