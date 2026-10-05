// authOptions pulls in openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}))

import { getServerSession } from 'next-auth'
import {
  getAuthenticatedSession,
  requireSession,
} from '@/app/auth/requireSession'

const mockGetServerSession = getServerSession as jest.Mock

describe('getAuthenticatedSession', () => {
  it('returns null without a session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    expect(await getAuthenticatedSession()).toBeNull()
  })

  it('returns null for a session without username', async () => {
    mockGetServerSession.mockResolvedValue({ user: { orcid: '0000' } })

    expect(await getAuthenticatedSession()).toBeNull()
  })

  it('returns the session of a logged-in user', async () => {
    const session = { user: { username: 'jdupont' } }
    mockGetServerSession.mockResolvedValue(session)

    expect(await getAuthenticatedSession()).toBe(session)
  })
})

describe('requireSession', () => {
  it('returns a 401 response without a session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const { session, error } = await requireSession()

    expect(session).toBeUndefined()
    expect(error?.status).toBe(401)
    expect(await error?.json()).toEqual({ error: 'User is not authenticated' })
  })

  it('returns the session of a logged-in user', async () => {
    const session = { user: { username: 'jdupont' } }
    mockGetServerSession.mockResolvedValue(session)

    expect(await requireSession()).toEqual({ session })
  })
})
