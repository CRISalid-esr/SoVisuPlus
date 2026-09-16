// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'

const mockComputeWordStreamForAgent = jest.fn()

jest.mock('@/lib/services/DocumentAggregateService', () => ({
  isWordstreamTopic: (topic: string) =>
    ['concept', 'person', 'journal'].includes(topic),
  DocumentAggregateService: jest.fn().mockImplementation(() => ({
    computeWordStreamForAgent: (...args: unknown[]) =>
      mockComputeWordStreamForAgent(...args),
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

const requestWith = (params: Record<string, string>) =>
  ({
    nextUrl: new URL(
      `http://localhost/api/wordstream?${new URLSearchParams(params)}`,
    ),
  }) as unknown as NextRequest

const validParams = {
  uid: 'person-1',
  entityType: 'person',
  lang: 'fr',
  topic: 'concept',
}

describe('GET /api/wordstream', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
    mockComputeWordStreamForAgent.mockResolvedValue({ series: [] })
  })

  it('returns the wordstream of the agent', async () => {
    const response = await GET(requestWith(validParams))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ series: [] })
  })

  it('rejects a missing uid', async () => {
    const response = await GET(requestWith({ ...validParams, uid: '' }))

    expect(response.status).toBe(400)
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(requestWith(validParams))

    expect(response.status).toBe(401)
    expect(mockComputeWordStreamForAgent).not.toHaveBeenCalled()
  })
})
