import { NextRequest } from 'next/server'
import { GET } from '@/app/api/vocabs/route'

jest.mock('@/lib/services/VocabSearchService', () => ({
  VocabSearchService: jest.fn().mockImplementation(() => ({
    suggest: jest.fn().mockResolvedValue({
      total: 1,
      items: [
        {
          iri: 'http://vocab.getty.edu/jel#3552',
          scheme: 'JEL',
          vocab: null,
          identifier: null,
          top_concept: false,
          lang_set: ['en', 'es'],
          score: 4,
          best_label: {
            text: 'surface strikes',
            lang: 'en',
            highlight: null,
            source_field: 'pref',
          },
          pref: [
            {
              text: 'surface strikes',
              lang: 'en',
              highlight: null,
            },
          ],
          alt: [
            {
              text: 'surface strike',
              lang: 'en',
              highlight: null,
            },
            {
              text: 'strikes, surface',
              lang: 'en',
              highlight: null,
            },
          ],
          description: null,
          broader: ['http://vocab.getty.edu/aat/300033549'],
          narrower: [],
        },
      ],
    }),
  })),
}))

jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn(),
    NextResponse: {
      json: jest.fn((data, init) => {
        return {
          json: async () => data,
          status: init?.status ?? 200,
        }
      }),
    },
  }
})

describe('GET handler', () => {
  let req: NextRequest

  beforeEach(() => {
    req = {
      nextUrl: new URL(process.env.VOCABS_URL! + '?q=strike&vocabs=jel,aat'),
    } as unknown as NextRequest
  })

  it('should return suggested keyword and totalItems', async () => {
    const response = await GET(req)

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()
    expect(jsonResponse.total).toBe(1)
    expect(jsonResponse.items).toEqual([
      {
        iri: 'http://vocab.getty.edu/jel#3552',
        scheme: 'JEL',
        vocab: null,
        identifier: null,
        top_concept: false,
        lang_set: ['en', 'es'],
        score: 4,
        best_label: {
          text: 'surface strikes',
          lang: 'en',
          highlight: null,
          source_field: 'pref',
        },
        pref: [
          {
            text: 'surface strikes',
            lang: 'en',
            highlight: null,
          },
        ],
        alt: [
          {
            text: 'surface strike',
            lang: 'en',
            highlight: null,
          },
          {
            text: 'strikes, surface',
            lang: 'en',
            highlight: null,
          },
        ],
        description: null,
        broader: ['http://vocab.getty.edu/aat/300033549'],
        narrower: [],
      },
    ])
  })

  it('should return error if query empty', async () => {
    req = {
      nextUrl: new URL(process.env.VOCABS_URL! + '?vocabs=jel,aat'),
    } as unknown as NextRequest

    const response = await GET(req)

    expect(response.status).toBe(400)
    const jsonResponse = await response.json()
    expect(jsonResponse.error).toBe('Invalid query string.')
  })

  it('should return error if invalid limit, offset or highlight', async () => {
    req = {
      nextUrl: new URL(
        process.env.VOCABS_URL! + '?q=strike&vocabs=jel,aat&limit=hello',
      ),
    } as unknown as NextRequest

    let response = await GET(req)

    expect(response.status).toBe(400)
    let jsonResponse = await response.json()
    expect(jsonResponse.error).toBe(
      'Invalid limit value : must be an integer between 1 and 100.',
    )

    req = {
      nextUrl: new URL(
        process.env.VOCABS_URL! + '?q=strike&vocabs=jel,aat&limit=0',
      ),
    } as unknown as NextRequest

    response = await GET(req)

    expect(response.status).toBe(400)
    jsonResponse = await response.json()
    expect(jsonResponse.error).toBe(
      'Invalid limit value : must be an integer between 1 and 100.',
    )

    req = {
      nextUrl: new URL(
        process.env.VOCABS_URL! + '?q=strike&vocabs=jel,aat&limit=101',
      ),
    } as unknown as NextRequest

    response = await GET(req)

    expect(response.status).toBe(400)
    jsonResponse = await response.json()
    expect(jsonResponse.error).toBe(
      'Invalid limit value : must be an integer between 1 and 100.',
    )

    req = {
      nextUrl: new URL(
        process.env.VOCABS_URL! +
          '?q=strike&vocabs=jel,aat&limit=10&offset=hello',
      ),
    } as unknown as NextRequest

    response = await GET(req)

    expect(response.status).toBe(400)
    jsonResponse = await response.json()
    expect(jsonResponse.error).toBe(
      'Invalid offset value : must be an integer upper than 0.',
    )

    req = {
      nextUrl: new URL(
        process.env.VOCABS_URL! +
          '?q=strike&vocabs=jel,aat&limit=20&offset=0&highlight=hello',
      ),
    } as unknown as NextRequest

    response = await GET(req)

    expect(response.status).toBe(400)
    jsonResponse = await response.json()
    expect(jsonResponse.error).toBe(
      'Invalid highlight value : must be a boolean.',
    )
  })
})
