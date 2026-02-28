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

export class AureHalAPIClient {
  private readonly AUREHAL_API_BASE_URL = 'https://api.archives-ouvertes.fr'

  private md5LowercaseEmail(email: string): string {
    return createHash('md5')
      .update(email.trim().toLowerCase(), 'utf8')
      .digest('hex')
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
