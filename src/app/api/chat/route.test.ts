/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth'
import { POST } from './route'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    })),
  },
}))

const mockSession = getServerSession as jest.Mock

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
      // Base URL only — the client appends the `/chat` endpoint path.
      NEXT_PUBLIC_CRISALID_AGENTS_API_URL: 'http://agents.test',
      CRISALID_AGENTS_API_KEY: 'secret-key',
    }
    mockSession.mockResolvedValue({ user: { username: 'jdoe' } })
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

  it('forwards the body with the api key and streams the response back', async () => {
    const upstream = new Response('{"type":"start","messageId":"m1"}\n', {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
    global.fetch = jest.fn().mockResolvedValue(upstream) as jest.Mock

    const body = {
      conversationId: 'c1',
      message: { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      messages: [],
    }
    const res = await POST(makeReq(body))

    // Upstream call carries the secret key and the forwarded body.
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('http://agents.test/chat')
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe('secret-key')
    expect(JSON.parse(init.body)).toEqual(body)

    // The upstream body is streamed through unchanged as NDJSON.
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/x-ndjson')
    expect(await res.text()).toBe('{"type":"start","messageId":"m1"}\n')
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
    delete process.env.NEXT_PUBLIC_CRISALID_AGENTS_API_URL
    const res = await POST(makeReq({ message: {}, messages: [] }))
    expect(res.status).toBe(502)
  })
})
