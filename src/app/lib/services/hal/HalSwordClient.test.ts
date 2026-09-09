import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HalSwordClient } from './HalSwordClient'
import { DepositArtifact } from './HalDepositPackager'

const BASE = 'https://api-preprod.archives-ouvertes.fr'
const ENDPOINT = `${BASE}/sword/hal/`

let tmpDir: string
let xmlArtifact: DepositArtifact
let zipArtifact: DepositArtifact

const lastFetchCall = () =>
  (global.fetch as jest.Mock).mock.calls[
    (global.fetch as jest.Mock).mock.calls.length - 1
  ]

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hal-sword-'))
  const xmlPath = path.join(tmpDir, 'art.xml')
  const zipPath = path.join(tmpDir, 'art.zip')
  fs.writeFileSync(xmlPath, '<TEI/>')
  fs.writeFileSync(zipPath, 'PK-ZIP')
  xmlArtifact = { kind: 'xml', filePath: xmlPath, contentType: 'text/xml' }
  zipArtifact = {
    kind: 'zip',
    filePath: zipPath,
    contentType: 'application/zip',
    contentDisposition: 'attachment; filename=art.xml',
  }
})

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }))

beforeEach(() => {
  process.env.HAL_ENDPOINT = BASE
  process.env.HAL_SERVICE_ACCOUNT_LOGIN = 'svc'
  process.env.HAL_SERVICE_ACCOUNT_PASSWORD = 'pw'
  global.fetch = jest.fn().mockResolvedValue({
    status: 202,
    text: async () => '<entry><id>hal-1</id></entry>',
  })
})

describe('HalSwordClient.deposit', () => {
  it('POSTs an XML body with Packaging, basic auth and On-Behalf-Of', async () => {
    const res = await new HalSwordClient().deposit(
      xmlArtifact,
      'login|marvin;idhal|arthur',
    )

    expect(res.status).toBe(202)
    const [url, init] = lastFetchCall()
    expect(url).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('text/xml')
    expect(init.headers['Packaging']).toBe(
      'http://purl.org/net/sword-types/AOfr',
    )
    expect(init.headers['On-Behalf-Of']).toBe('login|marvin;idhal|arthur')
    expect(init.headers['Authorization']).toBe(
      `Basic ${Buffer.from('svc:pw').toString('base64')}`,
    )
    expect(init.headers['Content-Disposition']).toBeUndefined()
  })

  it('adds Content-Disposition and zip content-type for a ZIP deposit', async () => {
    await new HalSwordClient().deposit(zipArtifact, 'login|m;idhal|a')
    const [, init] = lastFetchCall()
    expect(init.headers['Content-Type']).toBe('application/zip')
    expect(init.headers['Content-Disposition']).toBe(
      'attachment; filename=art.xml',
    )
  })
})

describe('HalSwordClient.getStatus', () => {
  it('GETs the status endpoint one level above the deposit collection', async () => {
    await new HalSwordClient().getStatus('hal-03701713')
    const [url, init] = lastFetchCall()
    expect(url).toBe(
      'https://api-preprod.archives-ouvertes.fr/sword/hal-03701713',
    )
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe(
      `Basic ${Buffer.from('svc:pw').toString('base64')}`,
    )
  })
})
