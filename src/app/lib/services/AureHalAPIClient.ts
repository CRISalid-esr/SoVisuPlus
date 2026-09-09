import { createHash } from 'crypto'

export type AureHalAuthorIdentifiers = {
  idHal_i?: number
  idHal_s?: string
}

export type AureHalSearchResponse = {
  response?: {
    numFound?: number
    start?: number
    numFoundExact?: boolean
    docs?: AureHalAuthorIdentifiers[]
  }
}

/** A HAL author-reference doc as returned by /ref/author (fields we consume). */
export type AureHalAuthorDoc = {
  person_i?: number
  form_i?: number
  firstName_s?: string
  lastName_s?: string
  middleName_s?: string
  fullName_s: string
  label_s?: string
  orcidId_s?: string[]
  emailDomain_s?: string[]
  idHal_s?: string
  idHal_i?: number
  idrefId_s?: string[]
  valid_s?: string
}

/** The two idHAL identifier variants a manual author lookup can target. */
export type IdHalKind = 'idhals' | 'idhali'

/**
 * True when a HAL author profile carries at least one usable identifier
 * (IdHAL, ORCID or IdRef). Profiles with none of these cannot identify a
 * contributor, so they are dropped from the name-based suggestion panel.
 */
export function authorDocHasIdentifier(doc: AureHalAuthorDoc): boolean {
  return Boolean(doc.idHal_s || doc.orcidId_s?.length || doc.idrefId_s?.length)
}

/** One organisation entry from /search/authorstructure (an author's affiliations). */
export type AureHalOrg = {
  idno?: string | string[]
  orgName: string | string[]
  date?: string | string[]
  desc?: {
    address?: { addrLine?: string; country?: string }
    ref?: string
  }
  listRelation?: { relation?: string | string[] }
}

export type AureHalAuthorStructureResponse = {
  response?: { result?: { org?: AureHalOrg[] } }
}

export type AureHalPublicationCountResponse = {
  response?: { numFound?: number }
}

/**
 * Normalise a contributor display name into a HAL free-text query token: strip
 * diacritics and replace hyphens / other special characters with spaces. Used to
 * build the `text:` clause of the author-suggestion search.
 */
export function normalizeHalNameQuery(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // drop combining diacritics
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // drop hyphens & other special chars
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build the single "affiliations" display string for an author from HAL
 * `/search/authorstructure` org entries. For each org: use `orgName[1]` if present
 * else `orgName[0]`; append `(addrLine)` if present, otherwise `(orgName[0])` when
 * `orgName[1]` was used. Orgs are joined with '. '.
 */
export function formatAuthorStructures(orgs: AureHalOrg[]): string {
  return orgs
    .map(formatAuthorOrg)
    .filter((entry): entry is string => Boolean(entry))
    .join('. ')
}

function formatAuthorOrg(org: AureHalOrg): string | null {
  const names = Array.isArray(org.orgName)
    ? org.orgName
    : org.orgName != null
      ? [org.orgName]
      : []
  const primary = names[1] ?? names[0]
  if (!primary) return null

  const addrLine = org.desc?.address?.addrLine
  let parenthetical: string | null = null
  if (addrLine) {
    parenthetical = addrLine
  } else if (names[1] != null && names[0] != null && names[0] !== names[1]) {
    parenthetical = names[0]
  }

  return parenthetical ? `${primary} (${parenthetical})` : primary
}

/** A HAL structure-reference doc as returned by /ref/structure (fields we consume). */
export type AureHalStructureDoc = {
  docid: string
  acronym_s?: string
  name_s?: string
  label_s?: string
  country_s?: string
  type_s?: string
  valid_s?: string
  code_s?: string[]
  idref_s?: string[]
  isni_s?: string[]
  rnsr_s?: string[]
  ror_s?: string[]
  wikidata_s?: string[]
  parentAcronym_s?: string[]
  parentName_s?: string[]
}

export type AureHalAuthorSearchResponse = {
  response?: {
    numFound?: number
    start?: number
    numFoundExact?: boolean
    docs?: AureHalAuthorDoc[]
  }
}

export type AureHalStructureSearchResponse = {
  response?: {
    numFound?: number
    start?: number
    numFoundExact?: boolean
    docs?: AureHalStructureDoc[]
  }
}

/**
 * Solr facet response for the `authorityInstitution_s` facet. The facet array
 * interleaves each value with its integer count: `["Univ A", 42, "Univ B", 7, …]`.
 */
export type AureHalInstitutionFacetResponse = {
  facet_counts?: {
    facet_fields?: {
      authorityInstitution_s?: Array<string | number>
    }
  }
}

const AUREHAL_MIN_QUERY_LENGTH = 2
// Affiliation name suggestions search structures from an imported text where even
// a single character is meaningful, so structure search allows a 1-char minimum.
const AUREHAL_MIN_STRUCTURE_QUERY_LENGTH = 1
const AUREHAL_REQUEST_TIMEOUT_MS = 15000

export class AureHalAPIClient {
  private readonly AUREHAL_API_BASE_URL = 'https://api.archives-ouvertes.fr'

  private md5LowercaseEmail(email: string): string {
    return createHash('md5')
      .update(email.trim().toLowerCase(), 'utf8')
      .digest('hex')
  }

  /**
   * GET a URL, aborting (and throwing) if it takes longer than `timeoutMs`.
   * A timed-out request is treated as a failed request (per the spec's 15s rule).
   */
  private async getJson<T>(
    url: string,
    context: string,
    timeoutMs: number = AUREHAL_REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(
          `${context}: HTTP ${res.status} ${res.statusText} for ${url} - ${body}`,
        )
      }
      return (await res.json()) as T
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${context}: request timed out after ${timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Run a HAL author-reference search for a free-text token. The token is wrapped
   * in `text:<token> AND valid_s:(PREFERRED OR INCOMING)` and results are sorted with
   * valid (PREFERRED) profiles first. Shared by the autocomplete and the
   * name-based profile suggestions.
   */
  private async authorSearch(queryText: string): Promise<AureHalAuthorDoc[]> {
    const url = new URL(`${this.AUREHAL_API_BASE_URL}/ref/author/`)
    url.searchParams.set(
      'q',
      `text:${queryText} AND valid_s:(PREFERRED OR INCOMING)`,
    )
    url.searchParams.set(
      'fl',
      'person_i,form_i,firstName_s,lastName_s,middleName_s,fullName_s,orcidId_s,emailDomain_s,idHal_s,idrefId_s,valid_s',
    )
    url.searchParams.set(
      'sort',
      'valid_s desc,idHal_s asc,orcidId_s asc,idrefId_s asc',
    )

    const data = await this.getJson<AureHalAuthorSearchResponse>(
      url.toString(),
      'AureHalAPIClient.authorSearch',
    )
    return data?.response?.docs ?? []
  }

  /**
   * Search HAL author profiles by free text. Backs the "Search in HAL" contributor
   * autocomplete. Returns the raw HAL docs (empty array if fewer than 2 chars).
   */
  async searchAuthors(query: string): Promise<AureHalAuthorDoc[]> {
    const normalized = query?.trim() ?? ''
    if (normalized.length < AUREHAL_MIN_QUERY_LENGTH) return []
    return this.authorSearch(normalized)
  }

  /**
   * Search HAL author profiles to suggest a match for a contributor, based on its
   * display name. The name is normalised (accents, hyphens and special characters
   * removed) before the search. Profiles without any identifier (IdHAL, ORCID or
   * IdRef) are dropped — they would leave the contributor unidentified. Returns []
   * for a too-short normalised name.
   */
  async searchAuthorSuggestions(
    displayName: string,
  ): Promise<AureHalAuthorDoc[]> {
    const normalized = normalizeHalNameQuery(displayName)
    if (normalized.length < AUREHAL_MIN_QUERY_LENGTH) return []
    return (await this.authorSearch(normalized)).filter(authorDocHasIdentifier)
  }

  /**
   * Fetch and format a HAL author's affiliations from /search/authorstructure.
   * Returns null unless all three required fields (firstName, lastName, email) are
   * non-empty; otherwise the joined affiliations string (possibly empty).
   */
  async getAuthorStructures(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<string | null> {
    const first = firstName?.trim() ?? ''
    const last = lastName?.trim() ?? ''
    const mail = email?.trim() ?? ''
    if (!first || !last || !mail) return null

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/search/authorstructure/`)
    url.searchParams.set('firstName_t', first)
    url.searchParams.set('lastName_t', last)
    url.searchParams.set('email', mail)

    const data = await this.getJson<AureHalAuthorStructureResponse>(
      url.toString(),
      'AureHalAPIClient.getAuthorStructures',
    )
    return formatAuthorStructures(data?.response?.result?.org ?? [])
  }

  /**
   * Fetch a HAL author's number of publications from /search via the
   * authIdFormPerson_s:<form_i>-<person_i> query. Returns null unless both ids are
   * present; otherwise the `numFound` count (0 when none).
   */
  async getAuthorPublicationCount(
    formId: string,
    personId: string,
  ): Promise<number | null> {
    const form = formId?.trim() ?? ''
    const person = personId?.trim() ?? ''
    if (!form || !person) return null

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/search/`)
    url.searchParams.set('q', `authIdFormPerson_s:${form}-${person}`)

    const data = await this.getJson<AureHalPublicationCountResponse>(
      url.toString(),
      'AureHalAPIClient.getAuthorPublicationCount',
    )
    return data?.response?.numFound ?? 0
  }

  /**
   * Search HAL organizations (structures) by free text. Backs both the affiliation
   * "Add HAL affiliation" autocomplete and the name-based suggestion feature.
   * Returns the raw HAL docs (empty array if fewer than 1 char).
   */
  async searchStructures(query: string): Promise<AureHalStructureDoc[]> {
    const normalized = query?.trim() ?? ''
    if (normalized.length < AUREHAL_MIN_STRUCTURE_QUERY_LENGTH) return []

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/ref/structure/`)
    url.searchParams.set('q', normalized)
    url.searchParams.set('fl', '*')
    url.searchParams.set(
      'sort',
      'docid asc,rnsr_s asc,ror_s asc,idref_s asc,isni_s asc,wikidata_s asc',
    )

    const data = await this.getJson<AureHalStructureSearchResponse>(
      url.toString(),
      'AureHalAPIClient.searchStructures',
    )
    return data?.response?.docs ?? []
  }

  /**
   * Search HAL issuing bodies / institutions via the `authorityInstitution_s` Solr facet.
   * Backs the REPORT institution and THESE/HDR issuing-body autocomplete. The facet array
   * interleaves value/count pairs, so we keep only the string entries. Returns [] for a
   * too-short query.
   */
  async searchInstitutions(query: string): Promise<string[]> {
    const normalized = query?.trim() ?? ''
    if (normalized.length < AUREHAL_MIN_QUERY_LENGTH) return []

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/search/`)
    url.searchParams.set('q', '*:*')
    url.searchParams.set('rows', '0')
    url.searchParams.set('facet', 'true')
    url.searchParams.set('facet.field', 'authorityInstitution_s')
    url.searchParams.set('facet.limit', '30')
    url.searchParams.set('facet.mincount', '1')
    url.searchParams.set('facet.contains.ignoreCase', 'true')
    url.searchParams.set('facet.contains', normalized)

    const data = await this.getJson<AureHalInstitutionFacetResponse>(
      url.toString(),
      'AureHalAPIClient.searchInstitutions',
    )
    const facet = data?.facet_counts?.facet_fields?.authorityInstitution_s ?? []
    // Keep only the facet values (strings); drop the interleaved integer counts.
    return facet.filter((entry): entry is string => typeof entry === 'string')
  }

  /**
   * Resolve a HAL author profile from an idHAL value, for manual verification
   * before an idHAL identifier is added. `kind` selects the exact query field:
   * `idhals` → `idHal_s:"<value>"`, `idhali` → `idHal_i:<value>`. Returns the
   * matching author doc (name + linked ORCID/IdRef + validity) or null.
   */
  async findAuthorByIdHal(
    value: string,
    kind: IdHalKind,
  ): Promise<AureHalAuthorDoc | null> {
    const normalized = value?.trim() ?? ''
    if (!normalized) {
      throw new Error('AureHalAPIClient.findAuthorByIdHal: value is empty')
    }
    // Guard against Solr query injection: idHal_i is numeric, idHal_s is a
    // slug (letters, digits, hyphens).
    if (kind === 'idhali' && !/^\d+$/.test(normalized)) {
      throw new Error(
        `AureHalAPIClient.findAuthorByIdHal: idHal_i must be numeric, got "${value}"`,
      )
    }
    if (kind === 'idhals' && !/^[a-z0-9-]+$/i.test(normalized)) {
      throw new Error(
        `AureHalAPIClient.findAuthorByIdHal: idHal_s has an invalid format: "${value}"`,
      )
    }

    const q =
      kind === 'idhali' ? `idHal_i:${normalized}` : `idHal_s:"${normalized}"`

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/ref/author/`)
    url.searchParams.set('q', q)
    url.searchParams.set(
      'fl',
      'person_i,form_i,firstName_s,lastName_s,middleName_s,fullName_s,orcidId_s,idHal_s,idHal_i,idrefId_s,valid_s',
    )

    const data = await this.getJson<AureHalAuthorSearchResponse>(
      url.toString(),
      'AureHalAPIClient.findAuthorByIdHal',
    )
    return data?.response?.docs?.[0] ?? null
  }

  /**
   * Resolve a HAL author (idHal) from a numeric uid (uid_i).
   * Uses: /ref/author?q=uid_i:<uid>&fl=idHal_s,idHal_i&indent=true
   */
  async findAuthorByUid(uid: string): Promise<AureHalAuthorIdentifiers | null> {
    const normalized = uid?.trim()
    if (!normalized) {
      throw new Error('AureHalAPIClient.findAuthorByUid: uid is empty')
    }
    if (!/^\d+$/.test(normalized)) {
      throw new Error(
        `AureHalAPIClient.findAuthorByUid: uid must be numeric, got "${uid}"`,
      )
    }

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/ref/author`)
    url.searchParams.set('q', `uid_i:${normalized}`)
    url.searchParams.set('indent', 'true')
    url.searchParams.set('fl', 'idHal_s,idHal_i') // add 'email*' if you want debug

    console.log(
      'AureHalAPIClient.findAuthorByUid: fetching URL',
      url.toString(),
    )

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `AureHalAPIClient.findAuthorByUid: HTTP ${res.status} ${res.statusText} for ${url.toString()} - ${body}`,
      )
    }

    const data = (await res.json()) as AureHalSearchResponse
    const docs = data?.response?.docs ?? []

    console.debug('AureHalAPIClient.findAuthorByUid: docs', docs)

    if (!docs.length) return null
    return docs[0]
  }

  /**
   * Resolve a HAL author (idHal) from an email (MD5 strategy).
   * Kept as a fallback.
   */
  async findAuthorByEmail(
    email: string,
  ): Promise<AureHalAuthorIdentifiers | null> {
    if (!email?.trim()) {
      throw new Error('AureHalAPIClient.findAuthorByEmail: email is empty')
    }

    const emailMd5 = this.md5LowercaseEmail(email)
    const url = new URL(`${this.AUREHAL_API_BASE_URL}/ref/author/`)
    url.searchParams.set('q', `emailId_s:${emailMd5}`)
    url.searchParams.set('indent', 'true')
    url.searchParams.set('fl', 'idHal_s,idHal_i')

    console.log(
      'AureHalAPIClient.findAuthorByEmail: fetching URL',
      url.toString(),
    )

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `AureHalAPIClient.findAuthorByEmail: HTTP ${res.status} ${res.statusText} for ${url.toString()} - ${body}`,
      )
    }

    const data = (await res.json()) as AureHalSearchResponse
    const docs = data?.response?.docs ?? []

    console.debug('AureHalAPIClient.findAuthorByEmail: docs', docs)

    if (!docs.length) return null
    return docs[0]
  }
}
