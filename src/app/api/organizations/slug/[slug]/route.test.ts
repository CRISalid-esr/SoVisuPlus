// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const buildOrganizationUnit = (hiddenEffective = false) =>
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
    false,
    [],
    hiddenEffective,
    hiddenEffective,
  )

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    fetchOrganizationUnitBySlug: jest.fn().mockImplementation((slug) => {
      if (slug === 'org:abcd') {
        return Promise.resolve(buildOrganizationUnit())
      }
      if (slug === 'org:hidden') {
        return Promise.resolve(buildOrganizationUnit(true))
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

const mockGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
})

describe('GET /api/organizations/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    jest.clearAllMocks()
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

  it('should return 404 for a hidden structure, even to a structure manager', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        username: 'jdupont',
        authz: {
          userId: 'u',
          roleAssignments: [
            {
              role: 'structure_manager',
              permissions: [
                {
                  action: 'update',
                  subject: 'OrganizationUnit',
                  fields: ['hidden'],
                },
              ],
              scopes: [],
            },
          ],
        },
      },
    })
    const response = await GET(req, {
      params: Promise.resolve({ slug: 'org:hidden' }),
    })

    expect(response.status).toBe(404)
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

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(req, { params: Promise.resolve(params) })

    expect(response.status).toBe(401)
  })
})
