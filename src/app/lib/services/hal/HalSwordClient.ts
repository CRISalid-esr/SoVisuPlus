import fs from 'node:fs'
import { DepositArtifact } from '@/lib/services/hal/HalDepositPackager'

const DEFAULT_HAL_ENDPOINT = 'https://api.archives-ouvertes.fr'
const PACKAGING = 'http://purl.org/net/sword-types/AOfr'

export interface SwordResponse {
  status: number
  body: string
}

/**
 * Thin HTTP layer over the HAL SWORD API. The only class that performs network I/O against HAL.
 * No database access, no XML parsing, no domain logic. Credentials and endpoint come from the
 * environment (`HAL_ENDPOINT`, `HAL_SERVICE_ACCOUNT_LOGIN`, `HAL_SERVICE_ACCOUNT_PASSWORD`). The
 * SWORD collection URL is derived as `HAL_ENDPOINT` + `/sword/hal/`.
 */
export class HalSwordClient {
  /** SWORD deposit collection URL — `HAL_ENDPOINT` + `/sword/hal/`. */
  private readonly swordEndpoint: string
  /** SWORD base one level above the collection — `HAL_ENDPOINT` + `/sword/` — used for status reads. */
  private readonly swordBase: string
  private readonly login: string
  private readonly password: string

  constructor() {
    const base = (process.env.HAL_ENDPOINT ?? DEFAULT_HAL_ENDPOINT).replace(
      /\/+$/,
      '',
    )
    this.swordBase = `${base}/sword/`
    this.swordEndpoint = `${this.swordBase}hal/`
    this.login = process.env.HAL_SERVICE_ACCOUNT_LOGIN ?? ''
    this.password = process.env.HAL_SERVICE_ACCOUNT_PASSWORD ?? ''
  }

  /** POST a deposit artifact (XML body or ZIP) on behalf of the given person. */
  async deposit(
    artifact: DepositArtifact,
    onBehalfOf: string,
  ): Promise<SwordResponse> {
    const body = await fs.promises.readFile(artifact.filePath)

    const headers: Record<string, string> = {
      Authorization: this.basicAuth(),
      Packaging: PACKAGING,
      'Content-Type': artifact.contentType,
      'On-Behalf-Of': onBehalfOf,
    }
    if (artifact.contentDisposition) {
      headers['Content-Disposition'] = artifact.contentDisposition
    }

    const res = await fetch(this.swordEndpoint, {
      method: 'POST',
      headers,
      body,
    })
    return { status: res.status, body: await res.text() }
  }

  /** GET the current status of a deposited record (`<sword-base>/<hal-id>`). */
  async getStatus(halId: string): Promise<SwordResponse> {
    const res = await fetch(this.statusUrl(halId), {
      method: 'GET',
      headers: { Authorization: this.basicAuth() },
    })
    return { status: res.status, body: await res.text() }
  }

  private basicAuth(): string {
    const token = Buffer.from(`${this.login}:${this.password}`).toString(
      'base64',
    )
    return `Basic ${token}`
  }

  /**
   * The status endpoint sits one level above the deposit collection: deposits go to
   * `.../sword/hal/` but status is read from `.../sword/<hal-id>`.
   */
  private statusUrl(halId: string): string {
    return `${this.swordBase}${halId}`
  }
}
