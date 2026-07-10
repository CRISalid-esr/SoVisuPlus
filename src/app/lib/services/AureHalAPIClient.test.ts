import {
  AureHalAPIClient,
  formatAuthorStructures,
  normalizeHalNameQuery,
} from '@/lib/services/AureHalAPIClient'

describe('AureHalAPIClient', () => {
  const client = new AureHalAPIClient()

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('searchInstitutions returns [] for a query shorter than 2 chars without calling HAL', async () => {
    await expect(client.searchInstitutions('a')).resolves.toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('searchInstitutions keeps only the facet string values (drops interleaved counts)', async () => {
    const mockResponse = {
      facet_counts: {
        facet_fields: {
          authorityInstitution_s: ['Université A', 42, 'Institut B', 7],
        },
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    })

    await expect(client.searchInstitutions('univ')).resolves.toEqual([
      'Université A',
      'Institut B',
    ])

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('facet.field=authorityInstitution_s')
    expect(decodeURIComponent(calledUrl)).toContain('facet.contains=univ')
  })

  it('searchInstitutions returns [] when the facet field is absent', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ facet_counts: { facet_fields: {} } }),
    })
    await expect(client.searchInstitutions('xyz')).resolves.toEqual([])
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

  it('searchAuthors returns [] without fetching when fewer than 2 chars', async () => {
    await expect(client.searchAuthors('a')).resolves.toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('searchAuthors hits /ref/author with the expected fl and sort and returns docs', async () => {
    const docs = [
      { fullName_s: 'Jean Dupont', idHal_s: 'jean-dupont', form_i: 42 },
    ]
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { docs } }),
    })

    await expect(client.searchAuthors('dupont')).resolves.toEqual(docs)

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    const params = new URL(calledUrl).searchParams
    expect(calledUrl).toContain('https://api.archives-ouvertes.fr/ref/author/')
    expect(params.get('q')).toBe(
      'text:dupont AND valid_s:(PREFERRED OR INCOMING)',
    )
    expect(params.get('fl')).toContain('fullName_s')
    expect(params.get('fl')).toContain('idHal_s')
    expect(params.get('fl')).toContain('valid_s')
    expect(params.get('sort')).toMatch(/^valid_s desc/)
  })

  it('searchAuthors returns [] when docs is empty', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { docs: [] } }),
    })
    await expect(client.searchAuthors('dupont')).resolves.toEqual([])
  })

  it('searchStructures hits /ref/structure with fl=* and structure sort', async () => {
    const docs = [{ docid: '300', name_s: 'Some Lab', ror_s: ['04ezmf85'] }]
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { docs } }),
    })

    await expect(client.searchStructures('lab')).resolves.toEqual(docs)

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    const decoded = decodeURIComponent(calledUrl)
    expect(calledUrl).toContain(
      'https://api.archives-ouvertes.fr/ref/structure/',
    )
    expect(decoded).toContain('q=lab')
    expect(decoded).toContain('fl=*')
    expect(new URL(calledUrl).searchParams.get('sort')).toMatch(/^docid asc/)
  })

  it('searchStructures fetches from a single character (1-char minimum)', async () => {
    const docs = [{ docid: '300', name_s: 'Some Lab' }]
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { docs } }),
    })

    await expect(client.searchStructures('a')).resolves.toEqual(docs)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('searchStructures returns [] without fetching when the query is empty', async () => {
    await expect(client.searchStructures('   ')).resolves.toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('searchStructures throws with HTTP details when response is not ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: jest.fn().mockResolvedValue('boom'),
    })
    await expect(client.searchStructures('lab')).rejects.toThrow(
      /AureHalAPIClient\.searchStructures: HTTP 500/,
    )
  })

  it('searchAuthorSuggestions normalises the display name (accents/hyphens stripped)', async () => {
    const docs = [{ fullName_s: 'Élodie Le-Goff', idHal_s: 'elodie-le-goff' }]
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { docs } }),
    })

    await expect(
      client.searchAuthorSuggestions('Élodie Le-Goff'),
    ).resolves.toEqual(docs)

    const params = new URL(
      (global.fetch as jest.Mock).mock.calls[0][0] as string,
    ).searchParams
    expect(params.get('q')).toBe(
      'text:Elodie Le Goff AND valid_s:(PREFERRED OR INCOMING)',
    )
  })

  it('searchAuthorSuggestions returns [] without fetching when normalised name too short', async () => {
    await expect(client.searchAuthorSuggestions('é-')).resolves.toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('searchAuthorSuggestions keeps only profiles bearing an identifier', async () => {
    const withIdHal = { fullName_s: 'A IdHal', idHal_s: 'a-idhal' }
    const withOrcid = { fullName_s: 'B Orcid', orcidId_s: ['0000-0001'] }
    const withIdref = { fullName_s: 'C Idref', idrefId_s: ['123'] }
    const noId = { fullName_s: 'D NoId' }
    const emptyArrays = { fullName_s: 'E Empty', orcidId_s: [], idrefId_s: [] }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        response: {
          docs: [withIdHal, noId, withOrcid, emptyArrays, withIdref],
        },
      }),
    })

    await expect(client.searchAuthorSuggestions('dupont')).resolves.toEqual([
      withIdHal,
      withOrcid,
      withIdref,
    ])
  })

  it('searchAuthorSuggestions returns [] when no profile has an identifier', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        response: {
          docs: [{ fullName_s: 'A NoId' }, { fullName_s: 'B NoId' }],
        },
      }),
    })

    await expect(client.searchAuthorSuggestions('dupont')).resolves.toEqual([])
  })

  it('searchAuthors (autocomplete) does NOT filter identifier-less profiles', async () => {
    const docs = [
      { fullName_s: 'Jean Dupont', idHal_s: 'jean-dupont' },
      { fullName_s: 'No Identifier' },
    ]
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { docs } }),
    })

    await expect(client.searchAuthors('dupont')).resolves.toEqual(docs)
  })

  it('getAuthorStructures returns null without fetching when a required field is missing', async () => {
    await expect(
      client.getAuthorStructures('Jean', '', 'univ.fr'),
    ).resolves.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('getAuthorStructures formats org entries (orgName[1], addrLine, orgName[0])', async () => {
    const response = {
      response: {
        result: {
          org: [
            {
              orgName: ['LS2N', 'Laboratoire des Sciences du Numérique'],
              desc: { address: { addrLine: 'Nantes', country: '' } },
            },
            { orgName: ['CNRS', 'Centre National'] },
            { orgName: 'IRD' },
          ],
        },
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(response),
    })

    await expect(
      client.getAuthorStructures('Jean', 'Dupont', 'univ.fr'),
    ).resolves.toBe(
      'Laboratoire des Sciences du Numérique (Nantes). Centre National (CNRS). IRD',
    )

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    const decoded = decodeURIComponent(calledUrl)
    expect(calledUrl).toContain(
      'https://api.archives-ouvertes.fr/search/authorstructure/',
    )
    expect(decoded).toContain('firstName_t=Jean')
    expect(decoded).toContain('lastName_t=Dupont')
    expect(decoded).toContain('email=univ.fr')
  })

  it('getAuthorPublicationCount returns null without fetching when an id is missing', async () => {
    await expect(client.getAuthorPublicationCount('42', '')).resolves.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('getAuthorPublicationCount queries authIdFormPerson_s and returns numFound', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: { numFound: 7 } }),
    })

    await expect(client.getAuthorPublicationCount('42', '99')).resolves.toBe(7)

    const decoded = decodeURIComponent(
      (global.fetch as jest.Mock).mock.calls[0][0] as string,
    )
    expect(decoded).toContain('q=authIdFormPerson_s:42-99')
  })

  it('getAuthorPublicationCount defaults to 0 when numFound is absent', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: {} }),
    })
    await expect(client.getAuthorPublicationCount('42', '99')).resolves.toBe(0)
  })
})

describe('normalizeHalNameQuery', () => {
  it('strips diacritics, hyphens and special characters, collapsing spaces', () => {
    expect(normalizeHalNameQuery('  Élodie  Le-Goff (épse) ')).toBe(
      'Elodie Le Goff epse',
    )
  })
})

describe('formatAuthorStructures', () => {
  it('uses orgName[0] alone when there is no addrLine nor orgName[1]', () => {
    expect(formatAuthorStructures([{ orgName: 'IRD' }])).toBe('IRD')
  })

  it('skips orgs without an orgName and joins with a point', () => {
    expect(
      formatAuthorStructures([
        { orgName: [] as unknown as string[] },
        { orgName: 'IRD' },
        { orgName: ['CNRS', 'Centre'] },
      ]),
    ).toBe('IRD. Centre (CNRS)')
  })
})
