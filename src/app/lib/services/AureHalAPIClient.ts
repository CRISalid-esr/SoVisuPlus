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
   * Resolve a HAL author (idHal) from an email.
   *
   * NOTE (FROM CCSD TIP): The email identifier in HAL is stored as an MD5 hash of the
   * lowercase email address. Therefore, to search for an author by email,
   * you need to:
   * - compute the MD5 hash of the lowercase email address
   * - use that hash in your search query.
   *
   * Uses: /ref/author/?q=emailId_s:<md5>&fl=idHal_s,idHal_i&indent=true
   */
  async findAuthorByEmail(
    email: string,
  ): Promise<AureHalAuthorIdentifiers | null> {
    if (!email?.trim()) {
      throw new Error('AureHalAPIClient.findAuthorByEmail: email is empty')
    }

    const emailMd5 = this.md5LowercaseEmail(email)
    const q = `emailId_s:${emailMd5}`

    const url = new URL(`${this.AUREHAL_API_BASE_URL}/ref/author/`)
    url.searchParams.set('q', q)
    url.searchParams.set('indent', 'true')
    url.searchParams.set('fl', 'idHal_s,idHal_i')

    console.log(
      'AureHalAPIClient.findAuthorByEmail: fetching URL',
      url.toString(),
    )

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      // avoid caching for fresh resolution
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
