import { NextRequest } from 'next/server'
import { GET } from './route'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'

const mockAddOrUpdateOrcidIdentifier = jest.fn()
const mockGetUserByPersonIdentifier = jest.fn()

jest.mock('@/lib/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserByPersonIdentifier: mockGetUserByPersonIdentifier,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    addOrUpdateOrcidIdentifier: mockAddOrUpdateOrcidIdentifier,
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

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      id: 'user-id',
      username: 'testuser',
    },
  })),
}))

global.fetch = jest.fn()

describe('GET /api/orcid/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    process.env.NEXT_PUBLIC_BASE_URL = 'https://sovisuplus.example.com'
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'fr,en'
    process.env.ORCID_CLIENT_ID = 'client-id'
    process.env.ORCID_CLIENT_SECRET = 'secret'
    process.env.ORCID_URL = 'https://orcid.org'
  })

  const makeReq = (url: string) =>
    ({ nextUrl: new URL(url) }) as unknown as NextRequest

  it('should call ORCID token endpoint and link ORCID on success', async () => {
    const user = {
      person: {
        uid: 'person-uid',
      },
    }

    const tokenResponse = {
      access_token: 'access-token-xyz',
      refresh_token: 'refresh-token-abc',
      expires_in: 3600,
      scope: '/read-limited',
      token_type: 'bearer',
      orcid: '0000-0002-1825-0097',
      name: 'ORCID User',
    }

    mockGetUserByPersonIdentifier.mockResolvedValue(user)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })

    const req: NextRequest = {
      nextUrl: new URL(
        'https://example.com/api/orcid/callback?code=abc123&lang=fr',
      ),
    } as unknown as NextRequest

    const response = await GET(req)

    // Redirect success
    const redirectUrl = response.headers.get('location')
    expect(redirectUrl).toBe(
      'https://sovisuplus.example.com/fr/account?success=orcid_authentication_success',
    )

    // Fetch called correctly
    expect(fetch).toHaveBeenCalledWith(
      'https://orcid.org/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(URLSearchParams),
      }),
    )

    // Validate body params
    const body = (fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams
    const params = new URLSearchParams(body)

    expect(params.get('client_id')).toBe('client-id')
    expect(params.get('client_secret')).toBe('secret')
    expect(params.get('code')).toBe('abc123')
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('redirect_uri')).toBe(
      'https://sovisuplus.example.com/api/orcid/callback?lang=fr',
    )

    // PersonService called with ORCIDIdentifier
    expect(mockAddOrUpdateOrcidIdentifier).toHaveBeenCalledTimes(1)

    const [personUidArg, orcidIdentifierArg] =
      mockAddOrUpdateOrcidIdentifier.mock.calls[0]

    expect(personUidArg).toBe('person-uid')
    expect(orcidIdentifierArg).toBeInstanceOf(ORCIDIdentifier)

    // Validate identifier content
    expect(orcidIdentifierArg.value).toBe('0000-0002-1825-0097')
    expect(orcidIdentifierArg.oauth?.accessToken).toBe('access-token-xyz')
    expect(orcidIdentifierArg.oauth?.refreshToken).toBe('refresh-token-abc')
    expect(orcidIdentifierArg.oauth?.tokenType).toBe('bearer')
    expect(orcidIdentifierArg.oauth?.scope).toEqual(['/read-limited'])

    // Dates: don't assert exact time, just shape
    expect(orcidIdentifierArg.oauth?.obtainedAt).toBeInstanceOf(Date)
    expect(orcidIdentifierArg.oauth?.expiresAt).toBeInstanceOf(Date)

    // ExpiresAt should be >= obtainedAt
    expect(
      (orcidIdentifierArg.oauth!.expiresAt as Date).getTime(),
    ).toBeGreaterThan((orcidIdentifierArg.oauth!.obtainedAt as Date).getTime())
  })

  it('should redirect with error when code is missing', async () => {
    const req = makeReq('https://example.com/api/orcid/callback?lang=fr')
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_no_code',
    )

    expect(fetch).not.toHaveBeenCalled()
    expect(mockGetUserByPersonIdentifier).not.toHaveBeenCalled()
    expect(mockAddOrUpdateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when session is missing (no username)', async () => {
    const { getServerSession } = jest.requireMock('next-auth') as {
      getServerSession: jest.Mock
    }
    getServerSession.mockResolvedValueOnce({ user: { id: 'user-id' } }) // username missing

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_authentication_failure_no_session',
    )

    expect(fetch).not.toHaveBeenCalled()
    expect(mockGetUserByPersonIdentifier).not.toHaveBeenCalled()
    expect(mockAddOrUpdateOrcidIdentifier).not.toHaveBeenCalled()
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

    expect(fetch).not.toHaveBeenCalled()
    expect(mockAddOrUpdateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when token request fails (response.ok=false)', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce({
      person: { uid: 'person-uid' },
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

    expect(mockAddOrUpdateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when token response is missing required fields', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce({
      person: { uid: 'person-uid' },
    })

    // Missing refresh_token, expires_in, scope => should hit missing_data
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

    expect(mockAddOrUpdateOrcidIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with error when PersonService fails to persist identifier', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValueOnce({
      person: { uid: 'person-uid' },
    })

    const tokenResponse = {
      access_token: 'access-token-xyz',
      refresh_token: 'refresh-token-abc',
      expires_in: 3600,
      scope: '/read-limited',
      token_type: 'bearer',
      orcid: '0000-0002-1825-0097',
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    })

    mockAddOrUpdateOrcidIdentifier.mockRejectedValueOnce(new Error('db error'))

    const req = makeReq(
      'https://example.com/api/orcid/callback?code=abc123&lang=fr',
    )
    const response = await GET(req)

    expect(response.headers.get('location')).toBe(
      'https://sovisuplus.example.com/fr/account?error=orcid_insert_failure',
    )
  })
})
