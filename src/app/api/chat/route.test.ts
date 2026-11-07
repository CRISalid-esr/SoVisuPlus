/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import {
  accessTokenNeedsRefresh,
  refreshKeycloakAccessToken,
} from '@/app/auth/keycloakTokens'
import { chatConfigService } from '@/lib/services/ChatConfigService'
import { POST } from './route'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/keycloakTokens', () => ({
  accessTokenNeedsRefresh: jest.fn(),
  refreshKeycloakAccessToken: jest.fn(),
}))
jest.mock('@/lib/services/ChatConfigService', () => ({
  chatConfigService: {
    getSystemPrompt: jest.fn().mockResolvedValue(''),
    isChatEnabled: jest.fn().mockResolvedValue(true),
  },
}))
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    })),
  },
}))

const mockSession = getServerSession as jest.Mock
const mockGetToken = getToken as jest.Mock
const mockNeedsRefresh = accessTokenNeedsRefresh as jest.Mock
const mockRefresh = refreshKeycloakAccessToken as jest.Mock
const mockGetSystemPrompt = chatConfigService.getSystemPrompt as jest.Mock
const mockIsChatEnabled = chatConfigService.isChatEnabled as jest.Mock

// Minimal NextRequest stand-in exposing the two members the route reads.
const makeReq = (body: unknown) =>
  ({
    json: async () => body,
    signal: new AbortController().signal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

const tokenExpiring = () =>
  new Response('{"error":"token_expiring"}', { status: 401 })

const ORIGINAL_FETCH = global.fetch

describe('POST /api/chat', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...OLD_ENV,
      // Base URL only — the client appends the `/agents/{name}/chat` endpoint path.
      CRISALID_AGENTS_API_URL: 'http://agents.test',
      NEXTAUTH_SECRET: 'nextauth-secret',
    }
    mockSession.mockResolvedValue({
      user: { username: 'jdoe', name: 'Jane Doe', personUid: 'person-123' },
    })
    mockGetToken.mockResolvedValue({
      username: 'jdoe',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      accessTokenExpiresAt: 9999999999,
    })
    mockNeedsRefresh.mockReturnValue(false)
    // Default: no system prompt configured (cleared by clearAllMocks above).
    mockGetSystemPrompt.mockResolvedValue('')
    mockIsChatEnabled.mockResolvedValue(true)
  })

  afterEach(() => {
    process.env = OLD_ENV
    global.fetch = ORIGINAL_FETCH
  })

  it('returns 401 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(makeReq({}))
    expect(res.status).toBe(401)
  })

  it('returns 404 without checking the session or calling upstream when the chat is disabled', async () => {
    mockIsChatEnabled.mockResolvedValue(false)
    global.fetch = jest.fn() as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'AI chat is disabled' })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockSession).not.toHaveBeenCalled()
  })

  it('requires reauthentication when the JWT carries no access token', async () => {
    mockGetToken.mockResolvedValue({ username: 'jdoe' })
    global.fetch = jest.fn() as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'reauthentication_required' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('requires reauthentication when the JWT could not be read', async () => {
    mockGetToken.mockResolvedValue(null)
    global.fetch = jest.fn() as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'reauthentication_required' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('requires reauthentication when the refresh token expired', async () => {
    mockGetToken.mockResolvedValue({
      username: 'jdoe',
      error: 'RefreshTokenExpired',
    })
    global.fetch = jest.fn() as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'reauthentication_required' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reads the JWT from the request with the NextAuth secret', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock
    const req = makeReq({ message: {}, messages: [] })

    await POST(req)

    expect(mockGetToken).toHaveBeenCalledWith({
      req,
      secret: 'nextauth-secret',
    })
  })

  it('targets the agent named by CRISALID_AGENTS_AGENT', async () => {
    process.env.CRISALID_AGENTS_AGENT = 'sorbobot'
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('', { status: 200 })) as jest.Mock

    await POST(
      makeReq({
        message: {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'hi' }],
        },
      }),
    )

    const [url] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('http://agents.test/agents/sorbobot/chat')
  })

  it('forwards the body with the bearer token and streams the response back', async () => {
    const upstream = new Response('{"type":"start","messageId":"m1"}\n', {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
    global.fetch = jest.fn().mockResolvedValue(upstream) as jest.Mock

    const body = {
      conversationId: 'c1',
      message: {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
      messages: [],
    }
    const res = await POST(makeReq(body))

    // Upstream call carries the user's access token and the forwarded body.
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('http://agents.test/agents/generic_agent/chat')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer access-1')
    expect(init.headers).not.toHaveProperty('x-api-key')

    // The user turn and conversation id are forwarded unchanged; without a configured system
    // prompt nothing is prepended (the identity comes from the token, not the conversation).
    const forwarded = JSON.parse(init.body)
    expect(forwarded.conversationId).toBe('c1')
    expect(forwarded.message).toEqual(body.message)
    expect(forwarded.messages).toEqual([])

    // The upstream NDJSON is re-framed as SSE: one `data:` event per line, payload unchanged.
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(
      'text/event-stream; charset=utf-8',
    )
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    expect(res.headers.get('cache-control')).toBe('no-cache, no-transform')
    expect(await res.text()).toBe('data: {"type":"start","messageId":"m1"}\n\n')
  })

  it('re-frames NDJSON lines split across reads and flushes a trailing line', async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"type":"start","messa'))
        controller.enqueue(encoder.encode('geId":"m1"}\n'))
        // Trailing line without a final newline must still be emitted on flush.
        controller.enqueue(encoder.encode('{"type":"finish","messageId":"m1"}'))
        controller.close()
      },
    })
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(body, { status: 200 })) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(await res.text()).toBe(
      'data: {"type":"start","messageId":"m1"}\n\n' +
        'data: {"type":"finish","messageId":"m1"}\n\n',
    )
  })

  it('passes upstream error responses through without SSE framing', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response('{"detail":"boom"}', { status: 500 }),
      ) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('{"detail":"boom"}')
  })

  it('passes an upstream 401 other than token_expiring through', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response('{"error":"wrong_audience"}', { status: 401 }),
      ) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(401)
    expect(await res.text()).toBe('{"error":"wrong_audience"}')
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('returns 502 when the upstream request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as jest.Mock
    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(res.status).toBe(502)
  })

  it('returns 502 when the endpoint url is not configured', async () => {
    delete process.env.CRISALID_AGENTS_API_URL
    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(res.status).toBe(502)
  })

  it('refreshes an access token about to expire before calling upstream', async () => {
    mockNeedsRefresh.mockReturnValue(true)
    mockRefresh.mockImplementation(async (token) => {
      token.accessToken = 'access-2'
      return token
    })
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(200)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    expect(init.headers.Authorization).toBe('Bearer access-2')
  })

  it('retries once with a refreshed token when upstream answers token_expiring', async () => {
    mockRefresh.mockImplementation(async (token) => {
      token.accessToken = 'access-2'
      return token
    })
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(tokenExpiring())
      .mockResolvedValueOnce(
        new Response('{"type":"start","messageId":"m1"}\n', { status: 200 }),
      ) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('data: {"type":"start","messageId":"m1"}\n\n')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    const calls = (global.fetch as jest.Mock).mock.calls
    expect(calls[0][1].headers.Authorization).toBe('Bearer access-1')
    expect(calls[1][1].headers.Authorization).toBe('Bearer access-2')
    // The same body is resent.
    expect(calls[1][1].body).toBe(calls[0][1].body)
  })

  it('requires reauthentication when the forced refresh fails', async () => {
    mockRefresh.mockImplementation(async (token) => {
      delete token.accessToken
      token.error = 'RefreshTokenExpired'
      return token
    })
    global.fetch = jest.fn().mockResolvedValue(tokenExpiring()) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'reauthentication_required' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('requires reauthentication when the retry is refused again', async () => {
    mockRefresh.mockImplementation(async (token) => {
      token.accessToken = 'access-2'
      return token
    })
    global.fetch = jest.fn().mockResolvedValue(tokenExpiring()) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'reauthentication_required' })
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('prepends the configured system prompt to the forwarded messages', async () => {
    mockGetSystemPrompt.mockResolvedValue('Be concise. No jokes.')
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock

    const userMessage = {
      id: 'u1',
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    }
    const history = [
      { id: 'a0', role: 'assistant', parts: [{ type: 'text', text: 'yo' }] },
    ]
    await POST(
      makeReq({
        conversationId: 'c1',
        message: userMessage,
        messages: history,
      }),
    )

    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    const forwarded = JSON.parse(init.body)
    // System prompt first, then the conversation; no identity message.
    expect(forwarded.messages).toEqual([
      {
        role: 'system',
        parts: [{ type: 'text', text: 'Be concise. No jokes.' }],
      },
      ...history,
    ])
    // The original user turn is preserved unchanged.
    expect(forwarded.message).toEqual(userMessage)
  })

  it('ignores a user field sent by the client', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock

    await POST(
      makeReq({
        message: {},
        messages: [],
        user: { firstName: 'Marie', lastName: 'Curie', uid: 'p-999' },
      }),
    )

    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    const forwarded = JSON.parse(init.body)
    expect(forwarded.user).toBeUndefined()
    expect(forwarded.messages).toEqual([])
    expect(init.body).not.toContain('Curie')
  })
})
