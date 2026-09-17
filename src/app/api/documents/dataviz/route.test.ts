// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/structureVisibility', () => ({
  isHiddenPerspective: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { isHiddenPerspective } from '@/app/auth/structureVisibility'
import { GET } from './route'

jest.mock('../../../lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    documentsPerYear: jest.fn().mockResolvedValue({
      publicationsPerYear: {
        '2022': [
          {
            uid: 'doc-123',
            oaStatus: 'GREEN',
            publicationDate: '2022',
            upwOAStatus: 'DIAMOND',
          },
        ],
      },
      perimeterUids: ['person-1', 'person-2'],
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

const mockGetServerSession = getServerSession as jest.Mock

const mockIsHiddenPerspective = isHiddenPerspective as jest.Mock

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
  mockIsHiddenPerspective.mockResolvedValue(false)
})

describe('GET handler', () => {
  let req: NextRequest

  beforeEach(() => {
    req = {
      nextUrl: new URL('http://localhost/api/endpoint?contributorType=person'),
    } as unknown as NextRequest
  })

  it('should return documents per year', async () => {
    const response = await GET(req)

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()
    expect(jsonResponse.documents).toEqual({
      '2022': [
        {
          uid: 'doc-123',
          oaStatus: 'GREEN',
          publicationDate: '2022',
          upwOAStatus: 'DIAMOND',
        },
      ],
    })
  })

  it('should return the perspective perimeter alongside the documents', async () => {
    const response = await GET(req)

    const jsonResponse = await response.json()
    expect(jsonResponse.perimeterUids).toEqual(['person-1', 'person-2'])
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(req)

    expect(response.status).toBe(401)
  })

  it('answers a hidden structure perspective as not found', async () => {
    mockIsHiddenPerspective.mockResolvedValue(true)

    const response = await GET(req)

    expect(response.status).toBe(404)
  })
})
