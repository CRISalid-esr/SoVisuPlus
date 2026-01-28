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

  /**
   * Resolve a HAL author (idHal) from an email.
   * Uses: /ref/author/?q=emailId_t:<email>&fl=idHal_s,idHal_i&indent=true
   */
  async findAuthorByEmail(
    email: string,
  ): Promise<AureHalAuthorIdentifiers | null> {
    if (!email?.trim()) {
      throw new Error('AureHalAPIClient.findAuthorByEmail: email is empty')
    }

    const q = `emailId_t:${email.trim()}`
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
