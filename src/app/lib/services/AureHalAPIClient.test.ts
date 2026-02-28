import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

describe('AureHalAPIClient', () => {
  const client = new AureHalAPIClient()

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('findAuthorByUid throws if uid is empty', async () => {
    await expect(client.findAuthorByUid('')).rejects.toThrow(
      'AureHalAPIClient.findAuthorByUid: uid is empty',
    )
  })

  it('findAuthorByUid throws if uid is not numeric', async () => {
    await expect(client.findAuthorByUid('12A3')).rejects.toThrow(
      'AureHalAPIClient.findAuthorByUid: uid must be numeric, got "12A3"',
    )
  })

  it('findAuthorByUid returns first doc when docs exist', async () => {
    const mockResponse = {
      response: {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [{ idHal_i: 1171146, idHal_s: 'jean-dupont' }],
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    })

    await expect(client.findAuthorByUid('119773')).resolves.toEqual({
      idHal_i: 1171146,
      idHal_s: 'jean-dupont',
    })

    // check that URL contains the expected query parameters
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('https://api.archives-ouvertes.fr/ref/author')
    expect(decodeURIComponent(calledUrl)).toContain('q=uid_i:119773')
    expect(decodeURIComponent(calledUrl)).toContain('fl=idHal_s,idHal_i')
  })

  it('findAuthorByUid returns null when docs is empty', async () => {
    const mockResponse = { response: { docs: [] } }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    })

    await expect(client.findAuthorByUid('119773')).resolves.toBeNull()
  })

  it('findAuthorByUid throws with HTTP details when response is not ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Server Error',
      text: jest.fn().mockResolvedValue('nope'),
    })

    await expect(client.findAuthorByUid('119773')).rejects.toThrow(
      /AureHalAPIClient\.findAuthorByUid: HTTP 503 Server Error/,
    )
  })

  it('findAuthorByEmail throws if email is empty', async () => {
    await expect(client.findAuthorByEmail('')).rejects.toThrow(
      'AureHalAPIClient.findAuthorByEmail: email is empty',
    )
  })

  it('findAuthorByEmail returns first doc when docs exist (md5 query)', async () => {
    const mockResponse = {
      response: {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [{ idHal_i: 1171146, idHal_s: 'jean-dupont' }],
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    })

    await expect(
      client.findAuthorByEmail('Jacques.Dupont@myuniv.edu'),
    ).resolves.toEqual({
      idHal_i: 1171146,
      idHal_s: 'jean-dupont',
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string

    // Ensure we used emailId_s: (md5) rather than emailId_t:
    expect(decodeURIComponent(calledUrl)).toContain('q=emailId_s:')
    expect(decodeURIComponent(calledUrl)).toContain('fl=idHal_s,idHal_i')
  })
})
