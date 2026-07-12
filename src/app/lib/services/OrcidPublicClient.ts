/**
 * Read-only client for the ORCID public data API (pub.orcid.org), used to
 * preview the person behind a manually entered ORCID before it is added on the
 * account page — the ORCID counterpart of AureHalAPIClient.findAuthorByIdHal.
 * No OAuth token is required for the public `/person` and `/employments`
 * endpoints.
 */

export type OrcidPersonData = {
  givenNames?: string
  familyName?: string
  creditName?: string
  otherNames: string[]
  affiliations: string[]
}

type OrcidValue = { value?: string | null } | null | undefined

const val = (v: OrcidValue): string | undefined => v?.value ?? undefined

/** Extract name + other names from a `/person` (or `/personal-details`) payload. */
export function parseOrcidPerson(
  person: Record<string, unknown> | null | undefined,
): Omit<OrcidPersonData, 'affiliations'> {
  const name = (person?.['name'] ?? undefined) as
    | Record<string, unknown>
    | undefined
  const otherNamesRaw = (
    person?.['other-names'] as Record<string, unknown> | undefined
  )?.['other-name'] as Array<{ content?: string }> | undefined

  return {
    givenNames: val(name?.['given-names'] as OrcidValue),
    familyName: val(name?.['family-name'] as OrcidValue),
    creditName: val(name?.['credit-name'] as OrcidValue),
    otherNames: (otherNamesRaw ?? [])
      .map((o) => o?.content)
      .filter((c): c is string => Boolean(c)),
  }
}

/** Extract "Org (Role)" affiliation strings from an `/employments` payload. */
export function parseOrcidEmployments(
  employments: Record<string, unknown> | null | undefined,
): string[] {
  const groups = (employments?.['affiliation-group'] ?? []) as Array<{
    summaries?: Array<Record<string, unknown>>
  }>
  const seen = new Set<string>()
  const result: string[] = []
  for (const group of groups) {
    for (const summary of group.summaries ?? []) {
      const emp = summary['employment-summary'] as
        | Record<string, unknown>
        | undefined
      const org = (emp?.['organization'] as { name?: string } | undefined)?.name
      if (!org) continue
      const role = val(emp?.['role-title'] as OrcidValue)
      const entry = role ? `${org} (${role})` : org
      if (!seen.has(entry)) {
        seen.add(entry)
        result.push(entry)
      }
    }
  }
  return result
}

export class OrcidPublicClient {
  /**
   * Public-API host derived from the OAuth host (`NEXT_PUBLIC_ORCID_URL`):
   * `orcid.org` → `pub.orcid.org`, `sandbox.orcid.org` → `pub.sandbox.orcid.org`.
   */
  private baseUrl(): string {
    const oauthUrl = process.env.NEXT_PUBLIC_ORCID_URL ?? 'https://orcid.org'
    try {
      return `https://pub.${new URL(oauthUrl).host}`
    } catch {
      return 'https://pub.orcid.org'
    }
  }

  private async getJson(
    orcid: string,
    segment: 'person' | 'employments',
  ): Promise<{ status: number; json?: Record<string, unknown> }> {
    const url = `${this.baseUrl()}/v3.0/${encodeURIComponent(orcid)}/${segment}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 404) return { status: 404 }
    if (!res.ok) {
      throw new Error(
        `OrcidPublicClient: HTTP ${res.status} ${res.statusText} for ${url}`,
      )
    }
    return { status: res.status, json: await res.json() }
  }

  /**
   * Fetch the public profile behind an ORCID. Returns null if the ORCID does not
   * resolve (404). Affiliations are best-effort: a failing `/employments` request
   * yields an empty list rather than failing the whole lookup.
   */
  async fetchPerson(orcid: string): Promise<OrcidPersonData | null> {
    const normalized = orcid?.trim() ?? ''
    if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(normalized)) {
      throw new Error(`OrcidPublicClient.fetchPerson: invalid ORCID "${orcid}"`)
    }

    const person = await this.getJson(normalized, 'person')
    if (person.status === 404 || !person.json) return null

    let affiliations: string[] = []
    try {
      const employments = await this.getJson(normalized, 'employments')
      if (employments.json) {
        affiliations = parseOrcidEmployments(employments.json)
      }
    } catch {
      // best-effort — an affiliations failure must not block the preview
    }

    return { ...parseOrcidPerson(person.json), affiliations }
  }
}
