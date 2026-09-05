/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth'
import { chatConfigService } from '@/lib/services/ChatConfigService'
import { POST } from './route'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/lib/services/ChatConfigService', () => ({
  chatConfigService: { getSystemPrompt: jest.fn().mockResolvedValue('') },
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
const mockGetSystemPrompt = chatConfigService.getSystemPrompt as jest.Mock

// Minimal NextRequest stand-in exposing the two members the route reads.
const makeReq = (body: unknown) =>
  ({
    json: async () => body,
    signal: new AbortController().signal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

const ORIGINAL_FETCH = global.fetch

describe('POST /api/chat', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...OLD_ENV,
      // Base URL only — the client appends the `/agents/{name}/chat` endpoint path.
      CRISALID_AGENTS_API_URL: 'http://agents.test',
      CRISALID_AGENTS_API_KEY: 'secret-key',
    }
    mockSession.mockResolvedValue({
      user: { username: 'jdoe', name: 'Jane Doe', personUid: 'person-123' },
    })
    // Default: no system prompt configured (cleared by clearAllMocks above).
    mockGetSystemPrompt.mockResolvedValue('')
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

  it('forwards the body with the api key and streams the response back', async () => {
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

    // Upstream call carries the secret key and the forwarded body.
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('http://agents.test/agents/generic_agent/chat')
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe('secret-key')

    // The user turn and conversation id are forwarded unchanged; the user-identity system
    // message is prepended into `messages`.
    const forwarded = JSON.parse(init.body)
    expect(forwarded.conversationId).toBe('c1')
    expect(forwarded.message).toEqual(body.message)
    expect(forwarded.messages).toHaveLength(1)
    expect(forwarded.messages[0].role).toBe('system')
    // No client `user` in the body → identity falls back to the session (name + person uid).
    const identity = forwarded.messages[0].parts[0].text
    expect(identity).toContain('Jane Doe')
    expect(identity).toContain('person-123')

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

  it('returns 502 when the upstream request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as jest.Mock
    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(res.status).toBe(502)
  })

  it('proxies without an api key when none is configured', async () => {
    delete process.env.CRISALID_AGENTS_API_KEY
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock

    const res = await POST(makeReq({ message: {}, messages: [] }))

    expect(res.status).toBe(200)
    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    expect(init.headers).not.toHaveProperty('x-api-key')
  })

  it('returns 502 when the endpoint url is not configured', async () => {
    delete process.env.CRISALID_AGENTS_API_URL
    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(res.status).toBe(502)
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
    await POST(
      makeReq({ conversationId: 'c1', message: userMessage, messages: [] }),
    )

    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    const forwarded = JSON.parse(init.body)
    // System prompt first, then the user-identity message, then the conversation.
    expect(forwarded.messages[0]).toEqual({
      role: 'system',
      parts: [{ type: 'text', text: 'Be concise. No jokes.' }],
    })
    expect(forwarded.messages[1].role).toBe('system')
    expect(forwarded.messages[1].parts[0].text).toContain('person-123')
    // The original user turn is preserved unchanged.
    expect(forwarded.message).toEqual(userMessage)
  })

  it('always includes the user-identity system message even without a system prompt', async () => {
    mockGetSystemPrompt.mockResolvedValue('')
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock

    await POST(makeReq({ message: {}, messages: [] }))

    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    const messages = JSON.parse(init.body).messages
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('system')
    expect(messages[0].parts[0].text).toContain('Jane Doe')
  })

  it('builds the identity from the client user (store) and does not forward it', async () => {
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
    // `user` is consumed to build the prompt, not forwarded to the agent.
    expect(forwarded.user).toBeUndefined()
    const identity = forwarded.messages[0].parts[0].text
    expect(identity).toContain('Marie Curie')
    expect(identity).toContain('p-999')
    // Client identity wins over the session fallback.
    expect(identity).not.toContain('Jane Doe')
    expect(identity).not.toContain('person-123')
  })

  it('marks the person UID as unavailable when the session has none', async () => {
    mockSession.mockResolvedValue({
      user: { username: 'jdoe', personUid: null },
    })
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('ok\n', { status: 200 })) as jest.Mock

    await POST(makeReq({ message: {}, messages: [] }))

    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    const identity = JSON.parse(init.body).messages[0].parts[0].text
    expect(identity).toContain('(unavailable)')
  })
})
