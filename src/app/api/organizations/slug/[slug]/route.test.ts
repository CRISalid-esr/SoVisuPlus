import { NextRequest } from 'next/server'
import { GET } from './route'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const buildOrganizationUnit = () =>
  new OrganizationUnit(
    '12345',
    'ABCD',
    [
      new Literal('ABCD Research Unit', 'en'),
      new Literal('Unité de recherche ABCD', 'fr'),
    ],
    [],
    OrganizationCategory.research_unit,
    OrganizationGenericType.unit,
    'UMR',
    [],
    'org:abcd',
  )

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    fetchOrganizationUnitBySlug: jest.fn().mockImplementation((slug) => {
      if (slug === 'org:abcd') {
        return Promise.resolve(buildOrganizationUnit())
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

describe('GET /api/organizations/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    params = { slug: 'org:abcd' }
    req = {} as unknown as NextRequest
  })

  it('should return an organization unit when found', async () => {
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual(buildOrganizationUnit())
  })

  it('should return 404 when organization unit is not found', async () => {
    params = { slug: 'org:efgh' }
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(404)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      error: 'OrganizationUnit with slug org:efgh not found',
    })
  })
})
