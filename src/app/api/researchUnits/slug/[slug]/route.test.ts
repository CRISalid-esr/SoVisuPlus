import { NextRequest } from 'next/server'
import { GET } from './route'
import { ResearchUnit } from '@/types/ResearchUnit'
import { Literal } from '@/types/Literal' // Adjust path if necessary

jest.mock('@/lib/services/ResearchUnitService', () => ({
  ResearchUnitService: jest.fn().mockImplementation(() => ({
    fetchResearchUnitBySlug: jest.fn().mockImplementation((slug) => {
      if (slug === 'research-unit-abcd') {
        return Promise.resolve(
          new ResearchUnit(
            '12345',
            'ABCD',
            [
              new Literal('ABCD Research Unit', 'en'),
              new Literal('Unité de recherche ABCD', 'fr'),
            ],
            [],
            'ABCD_signature',
            [],
            'research_unit',
            'research-unit-abcd',
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

describe('GET /api/research-unit/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    params = { slug: 'research-unit-abcd' }
    req = {} as unknown as NextRequest
  })

  it('should return a research unit when found', async () => {
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual(
      new ResearchUnit(
        '12345',
        'ABCD',
        [
          new Literal('ABCD Research Unit', 'en'),
          new Literal('Unité de recherche ABCD', 'fr'),
        ],
        [],
        'ABCD_signature',
        [],
        'research_unit',
        'research-unit-abcd',
      ),
    )
  })

  it('should return 404 when research unit is not found', async () => {
    params = { slug: 'research-unit-efgh' }
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(404)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      error: 'ResearchUnit with slug research-unit-efgh not found',
    })
  })
})
