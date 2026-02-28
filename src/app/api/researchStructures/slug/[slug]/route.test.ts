import { NextRequest } from 'next/server'
import { GET } from './route'
import { ResearchStructure } from '@/types/ResearchStructure'
import { Literal } from '@/types/Literal' // Adjust path if necessary

jest.mock('@/lib/services/ResearchStructureService', () => ({
  ResearchStructureService: jest.fn().mockImplementation(() => ({
    fetchResearchStructureBySlug: jest.fn().mockImplementation((slug) => {
      if (slug === 'research-structure-abcd') {
        return Promise.resolve(
          new ResearchStructure(
            '12345',
            'ABCD',
            [
              new Literal('ABCD Research Structure', 'en'),
              new Literal('Structure de recherche ABCD', 'fr'),
            ],
            [],
            'ABCD_signature',
            [],
            'research_structure',
            'research-structure-abcd',
          ),
        )
      }
      return Promise.resolve(null)
    }),
  })),
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}))

describe('GET /api/research-structure/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    params = { slug: 'research-structure-abcd' }
    req = {} as unknown as NextRequest
  })

  it('should return a research structure when found', async () => {
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual(
      new ResearchStructure(
        '12345',
        'ABCD',
        [
          new Literal('ABCD Research Structure', 'en'),
          new Literal('Structure de recherche ABCD', 'fr'),
        ],
        [],
        'ABCD_signature',
        [],
        'research_structure',
        'research-structure-abcd',
      ),
    )
  })

  it('should return 404 when research structure is not found', async () => {
    params = { slug: 'research-structure-efgh' }
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(404)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      error: 'ResearchStructure with slug research-structure-efgh not found',
    })
  })
})
