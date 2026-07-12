import {
  OrcidPublicClient,
  parseOrcidPerson,
  parseOrcidEmployments,
} from '@/lib/services/OrcidPublicClient'

describe('parseOrcidPerson', () => {
  it('extracts given/family/credit names and other names', () => {
    const person = {
      name: {
        'given-names': { value: 'Josiah' },
        'family-name': { value: 'Carberry' },
        'credit-name': { value: 'J. Carberry' },
      },
      'other-names': {
        'other-name': [
          { content: 'Josiah Stinkney Carberry' },
          { content: '' },
        ],
      },
    }
    expect(parseOrcidPerson(person)).toEqual({
      givenNames: 'Josiah',
      familyName: 'Carberry',
      creditName: 'J. Carberry',
      otherNames: ['Josiah Stinkney Carberry'],
    })
  })

  it('tolerates missing fields', () => {
    expect(parseOrcidPerson({})).toEqual({
      givenNames: undefined,
      familyName: undefined,
      creditName: undefined,
      otherNames: [],
    })
  })
})

describe('parseOrcidEmployments', () => {
  it('builds "Org (Role)" strings and dedups', () => {
    const employments = {
      'affiliation-group': [
        {
          summaries: [
            {
              'employment-summary': {
                organization: { name: 'Brown University' },
                'role-title': { value: 'Professor' },
              },
            },
          ],
        },
        {
          summaries: [
            {
              'employment-summary': {
                organization: { name: 'Wesleyan University' },
                'role-title': null,
              },
            },
            {
              'employment-summary': {
                organization: { name: 'Brown University' },
                'role-title': { value: 'Professor' },
              },
            },
          ],
        },
      ],
    }
    expect(parseOrcidEmployments(employments)).toEqual([
      'Brown University (Professor)',
      'Wesleyan University',
    ])
  })

  it('returns [] for an empty payload', () => {
    expect(parseOrcidEmployments({})).toEqual([])
  })
})

describe('OrcidPublicClient.fetchPerson', () => {
  const client = new OrcidPublicClient()

  beforeEach(() => {
    global.fetch = jest.fn()
    delete process.env.ORCID_PUBLIC_API_URL
  })
  afterEach(() => jest.resetAllMocks())

  const okJson = (json: unknown) => ({
    ok: true,
    status: 200,
    json: async () => json,
  })

  it('rejects an invalid ORCID format without fetching', async () => {
    await expect(client.fetchPerson('not-an-orcid')).rejects.toThrow(/invalid/i)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('queries the production pub host by default and merges person + employments', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        okJson({
          name: {
            'given-names': { value: 'Josiah' },
            'family-name': { value: 'Carberry' },
          },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          'affiliation-group': [
            {
              summaries: [
                {
                  'employment-summary': {
                    organization: { name: 'Brown University' },
                    'role-title': { value: 'Professor' },
                  },
                },
              ],
            },
          ],
        }),
      )

    const data = await client.fetchPerson('0000-0002-1825-0097')
    expect(data).toEqual({
      givenNames: 'Josiah',
      familyName: 'Carberry',
      creditName: undefined,
      otherNames: [],
      affiliations: ['Brown University (Professor)'],
    })

    const personUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(personUrl).toBe(
      'https://pub.orcid.org/v3.0/0000-0002-1825-0097/person',
    )
  })

  it('returns null when the ORCID does not resolve (404)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 })
    await expect(client.fetchPerson('0000-0002-1825-0000')).resolves.toBeNull()
  })

  it('keeps affiliations empty when /employments fails (best-effort)', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        okJson({ name: { 'given-names': { value: 'Jane' } } }),
      )
      .mockRejectedValueOnce(new Error('employments down'))

    const data = await client.fetchPerson('0000-0002-1825-0097')
    expect(data?.affiliations).toEqual([])
    expect(data?.givenNames).toBe('Jane')
  })

  it('uses ORCID_PUBLIC_API_URL when set (e.g. a sandbox deployment)', async () => {
    process.env.ORCID_PUBLIC_API_URL = 'https://pub.sandbox.orcid.org/'
    ;(global.fetch as jest.Mock).mockResolvedValue(okJson({ name: {} }))
    await client.fetchPerson('0000-0002-1825-0097')
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    // trailing slash stripped, no double slash before /v3.0
    expect(url).toBe(
      'https://pub.sandbox.orcid.org/v3.0/0000-0002-1825-0097/person',
    )
  })
})
