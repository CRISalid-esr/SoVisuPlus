/**
 * @jest-environment node
 */
import type { ChatMessage, ChatMessageChunk } from '@mui/x-chat-headless'
import { createAiChatAdapter } from './aiChatAdapter'

const userMessage: ChatMessage = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: 'hi' }],
}

// Build a proxy Response whose body is NDJSON (one JSON object per line).
const ndjsonResponse = (chunks: object[]) =>
  new Response(chunks.map((c) => JSON.stringify(c)).join('\n') + '\n', {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })

// Build a Response that emits raw pieces (to exercise cross-read line buffering).
const piecedResponse = (pieces: string[]) => {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece))
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}

const drain = async (stream: ReadableStream<ChatMessageChunk>) => {
  const reader = stream.getReader()
  const chunks: ChatMessageChunk[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return chunks
}

// The adapter only ever emits bare ChatMessageChunks (never envelopes), so narrow the union.
const send = async (adapter: ReturnType<typeof createAiChatAdapter>) => {
  const stream = await adapter.sendMessage({
    conversationId: 'c1',
    message: userMessage,
    messages: [],
    signal: new AbortController().signal,
  })
  return stream as ReadableStream<ChatMessageChunk>
}

const ORIGINAL_FETCH = global.fetch

describe('createAiChatAdapter', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    jest.clearAllMocks()
  })

  it('returns seeded conversations from listConversations', async () => {
    const adapter = createAiChatAdapter({
      seed: [
        {
          id: 'welcome',
          title: 'Welcome',
          messages: [{ role: 'assistant', text: 'hello' }],
        },
      ],
    })
    const { conversations } = await adapter.listConversations!()
    expect(conversations.map((c) => c.id)).toContain('welcome')
  })

  it('streams the parsed chunks and persists the assistant reply', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      ndjsonResponse([
        { type: 'start', messageId: 'm1' },
        { type: 'text-start', id: 'm1-text-1' },
        { type: 'text-delta', id: 'm1-text-1', delta: 'Hello' },
        { type: 'text-delta', id: 'm1-text-1', delta: ' world' },
        { type: 'text-end', id: 'm1-text-1' },
        { type: 'finish', messageId: 'm1' },
      ]),
    ) as jest.Mock

    const adapter = createAiChatAdapter()
    const chunks = await drain(await send(adapter))

    expect(chunks.map((c) => c.type)).toEqual([
      'start',
      'text-start',
      'text-delta',
      'text-delta',
      'text-end',
      'finish',
    ])

    // The user turn and the assembled assistant reply are persisted so that a later
    // listMessages (conversation switch) returns the full thread.
    const { messages } = await adapter.listMessages!({ conversationId: 'c1' })
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].parts[0]).toEqual({ type: 'text', text: 'Hello world' })
  })

  it('passes tool-activity chunks through unchanged', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      ndjsonResponse([
        { type: 'start', messageId: 'm1' },
        {
          type: 'tool-input-available',
          toolCallId: 't1',
          toolName: 'graph-search',
          input: { q: 'x' },
        },
        { type: 'tool-output-available', toolCallId: 't1', output: 'result' },
        { type: 'text-start', id: 'm1-text-1' },
        { type: 'text-delta', id: 'm1-text-1', delta: 'done' },
        { type: 'text-end', id: 'm1-text-1' },
        { type: 'finish', messageId: 'm1' },
      ]),
    ) as jest.Mock

    const adapter = createAiChatAdapter()
    const chunks = await drain(await send(adapter))
    expect(chunks.map((c) => c.type)).toEqual([
      'start',
      'tool-input-available',
      'tool-output-available',
      'text-start',
      'text-delta',
      'text-end',
      'finish',
    ])
  })

  it('buffers NDJSON lines split across reads', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      piecedResponse([
        '{"type":"start","messa',
        'geId":"m1"}\n{"type":"finish","messageId":"m1"}\n',
      ]),
    ) as jest.Mock

    const adapter = createAiChatAdapter()
    const chunks = await drain(await send(adapter))
    expect(chunks.map((c) => c.type)).toEqual(['start', 'finish'])
  })

  it('forwards the abort signal to the proxy fetch', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        ndjsonResponse([{ type: 'finish', messageId: 'm1' }]),
      ) as jest.Mock

    const controller = new AbortController()
    const adapter = createAiChatAdapter()
    await adapter.sendMessage({
      conversationId: 'c1',
      message: userMessage,
      messages: [],
      signal: controller.signal,
    })

    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    expect(init.signal).toBe(controller.signal)
  })

  it('rejects with a status-mapped message when the proxy responds with an error', async () => {
    // No catalog is loaded in these node tests, so Lingui echoes the message id.
    const cases: [number, string][] = [
      [400, 'ai_chat_error_bad_request'],
      [403, 'ai_chat_error_unauthorized'],
      [404, 'ai_chat_error_not_found'],
      [500, 'ai_chat_error_server'],
    ]
    for (const [status, id] of cases) {
      global.fetch = jest
        .fn()
        .mockResolvedValue(new Response('nope', { status })) as jest.Mock
      const adapter = createAiChatAdapter()
      await expect(send(adapter)).rejects.toThrow(id)
    }
  })

  it('rejects with a network-failure message when the proxy fetch throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as jest.Mock

    const adapter = createAiChatAdapter()
    await expect(send(adapter)).rejects.toThrow('ai_chat_error_network')
  })
})
