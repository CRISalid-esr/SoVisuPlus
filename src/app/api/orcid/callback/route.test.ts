import { NextRequest } from 'next/server'
import { GET } from './route'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'

const mockAuthenticateOrcidIdentifier = jest.fn()
const mockGetUserByPersonIdentifier = jest.fn()
const mockFindIdentifierValue = jest.fn()

jest.mock('@/lib/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserByPersonIdentifier: mockGetUserByPersonIdentifier,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    authenticateOrcidIdentifier: mockAuthenticateOrcidIdentifier,
  })),
}))

jest.mock('@/lib/daos/PersonDAO', () => ({
  PersonDAO: jest.fn().mockImplementation(() => ({
    findIdentifierValue: mockFindIdentifierValue,
  })),
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: jest.fn((url: string) => ({
      headers: {
        get: (header: string) => (header === 'location' ? url : null),
      },
    })),
  },
}))

import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

const authzWithPermission = makeAuthzContext({
  roleAssignments: [
    makeAssignment('account_editor', [
      {
        action: PermissionAction.update,
        subject: PermissionSubject.Person,
        fields: ['identifiers'],
      },
    ]),
  ],
})

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

global.fetch = jest.fn()

describe('GET /api/orcid/callback', () => {
  const mockSession = {
    user: { id: 'user-id', username: 'testuser', authz: authzWithPermission },
  }

  const mockPerson = (uid: string) => ({
    uid,
    authzProperties: {
      __type: 'Person',
      perimeter: { Person: [uid], ResearchUnit: [] },
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = jest.requireMock('next-auth') as {
      getServerSession: jest.Mock
    }
    getServerSession.mockResolvedValue(mockSession)
    // Default: no ORCID stored yet → add-through-authentication
    mockFindIdentifierValue.mockResolvedValue(null)

    process.env.NEXT_PUBLIC_BASE_URL = 'https://sovisuplus.example.com'
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'fr,en'
    process.env.NEXT_PUBLIC_ORCID_CLIENT_ID = 'client-id'
    process.env.ORCID_CLIENT_SECRET = 'secret'
    process.env.NEXT_PUBLIC_ORCID_URL = 'https://orcid.org'
  })

  const makeReq = (url: string) =>
    ({ nextUrl: new URL(url) }) as unknown as NextRequest

  const okToken = (extra: Record<string, unknown> = {}) => ({
    access_token: 'access-token-xyz',
    refresh_token: 'refresh-token-abc',
    expires_in: 3600,
    scope: '/read-limited',
    token_type: 'bearer',
    orcid: '0000-0002-1825-0097',
    ...extra,
  })

  it('should call ORCID token endpoint and authenticate ORCID on success', async () => {
    const user = { person: mockPerson('person-uid') }
    const tokenResponse = okToken({ name: 'ORCID User' })

    mockGetUserByPersonIdentifier.mockResolvedValue(user)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?success=orcid_authentication_success',
    )

    expect(fetch).toHaveBeenCalledWith(
      'https://orcid.org/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(URLSearchParams),
      }),
    )

    expect(mockAuthenticateOrcidIdentifier).toHaveBeenCalledTimes(1)
    const [personUidArg, orcidIdentifierArg] =
      mockAuthenticateOrcidIdentifier.mock.calls[0]
    expect(personUidArg).toBe('person-uid')
    expect(orcidIdentifierArg).toBeInstanceOf(ORCIDIdentifier)
    expect(orcidIdentifierArg.value).toBe('0000-0002-1825-0097')
    expect(orcidIdentifierArg.oauth?.accessToken).toBe('access-token-xyz')
  })

  it('authenticates in place when the stored ORCID matches', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValue({
      person: mockPerson('person-uid'),
    })
    mockFindIdentifierValue.mockResolvedValue('0000-0002-1825-0097')
    const tokenResponse = okToken()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?success=orcid_authentication_success',
    )
    expect(mockAuthenticateOrcidIdentifier).toHaveBeenCalledTimes(1)
  })

  it('fails with a mismatch error when the stored ORCID differs', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValue({
      person: mockPerson('person-uid'),
    })
    mockFindIdentifierValue.mockResolvedValue('0000-0001-0000-0000')
    const tokenResponse = okToken()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_value_mismatch',
    )
    expect(mockAuthenticateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when code is missing', async () => {
    const req = makeReq('https://example.com/api/orcid/callback?lang=fr')
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_no_code',
    )
    expect(fetch).not.toHaveBeenCalled()
    expect(mockAuthenticateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when session is missing (no username)', async () => {
    const { getServerSession } = jest.requireMock('next-auth') as {
      getServerSession: jest.Mock
    }
    getServerSession.mockResolvedValueOnce({ user: { id: 'user-id' } })

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_no_session',
    )
    expect(mockAuthenticateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when user is not found', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce(null)

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_user_not_found',
    )
    expect(mockAuthenticateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when token request fails (response.ok=false)', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce({
      person: mockPerson('person-uid'),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'bad request',
      json: async () => ({ error: 'invalid_grant' }),
    })

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_token_request',
    )
    expect(mockAuthenticateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when token response is missing required fields', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce({
      person: mockPerson('person-uid'),
    })
    const tokenResponse = {
      access_token: 'access-token-xyz',
      token_type: 'bearer',
      orcid: '0000-0002-1825-0097',
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_missing_data',
    )
    expect(mockAuthenticateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when PersonService fails to persist identifier', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce({
      person: mockPerson('person-uid'),
    })
    const tokenResponse = okToken()
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })
    mockAuthenticateOrcidIdentifier.mockRejectedValueOnce(new Error('db error'))

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_insert_failure',
    )
  })
})
