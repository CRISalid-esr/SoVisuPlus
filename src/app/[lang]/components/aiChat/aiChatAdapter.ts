import type {
  ChatAdapter,
  ChatConversation,
  ChatMessage,
  ChatMessageChunk,
  ChatRole,
} from '@mui/x-chat-headless'
import { t } from '@lingui/core/macro'

/**
 * Client-side `ChatAdapter` for the AI chat widget. It is the ONLY module that knows the chat
 * wire format, so `AiChatWidget.tsx` never changes.
 *
 * The Crisalid Agents backend is stateless — it stores no conversations and exposes no
 * list/history endpoints. So conversation and message state is owned here, in memory, for the
 * lifetime of the adapter instance (it resets on a full page reload). `sendMessage` /
 * `regenerate` POST to our own same-origin `/api/chat` proxy, which injects the secret API key
 * and streams the backend's NDJSON response straight back.
 *
 * The proxy re-frames the backend's NDJSON as SSE (`data: <json>\n\n`, `text/event-stream`) so
 * reverse proxies in front of the deployment stream it unbuffered. Each event's payload is
 * exactly `ChatMessageChunk`-shaped (`start` / `text-start` / `text-delta` / `text-end` /
 * `finish`, plus `tool-*`), so we parse each `data:` line and forward it unchanged, while
 * tapping the text to persist the assistant reply for a later `listMessages` (conversation
 * switch). Bare NDJSON lines (no `data:` prefix) are still accepted for compatibility with a
 * proxy that does not re-frame.
 */

const DEFAULT_API_PATH = '/api/chat'

const getMessageText = (message: ChatMessage): string =>
  message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')

const nowIso = () => new Date().toISOString()

// Translated, status-appropriate message for a failed chat request. Each `t` call is a static
// id so the extractor picks it up.
const errorMessageForStatus = (status: number): string => {
  if (status === 400) return t`ai_chat_error_bad_request`
  if (status === 401 || status === 403) return t`ai_chat_error_unauthorized`
  if (status === 404) return t`ai_chat_error_not_found`
  if (status >= 500) return t`ai_chat_error_server`
  return t`ai_chat_error_generic`
}

export interface AiChatSeedConversation {
  /** Stable id; a random one is generated when omitted. */
  id?: string
  title?: string
  messages: { role: ChatRole; text: string }[]
}

/** Signed-in user's identity, sent with each turn so the agent can scope "me"/"my" queries. */
export interface AiChatUser {
  firstName?: string
  lastName?: string
  uid?: string
}

export interface CreateAiChatAdapterOptions {
  /**
   * Same-origin proxy path that forwards to the agents backend. @default '/api/chat'
   */
  apiPath?: string
  /**
   * Conversations to pre-populate (e.g. a "Welcome" thread). At least one conversation is
   * required for the split list / back-arrow UI to engage.
   */
  seed?: AiChatSeedConversation[]
  /**
   * Resolves the current user's identity at send time (read from the store, which may load after
   * the adapter is created). Included in each request body so the proxy can add it to the prompt.
   */
  getUser?: () => AiChatUser | null | undefined
}

export function createAiChatAdapter(
  options: CreateAiChatAdapterOptions = {},
): ChatAdapter {
  const apiPath = options.apiPath ?? DEFAULT_API_PATH
  const getUser = options.getUser ?? (() => undefined)

  // Source of truth for what `listConversations` / `listMessages` return.
  const conversations = new Map<string, ChatConversation>()
  const messagesByConversation = new Map<string, ChatMessage[]>()

  for (const seed of options.seed ?? []) {
    const id = seed.id ?? crypto.randomUUID()
    conversations.set(id, { id, title: seed.title, lastMessageAt: nowIso() })
    messagesByConversation.set(
      id,
      seed.messages.map((message, index) => ({
        id: `${id}-seed-${index}`,
        conversationId: id,
        role: message.role,
        parts: [{ type: 'text', text: message.text }],
        createdAt: nowIso(),
      })),
    )
  }

  const registerConversation = (id: string, firstText?: string) => {
    if (!conversations.has(id)) {
      conversations.set(id, {
        id,
        title: firstText?.slice(0, 60) || undefined,
        lastMessageAt: nowIso(),
      })
      messagesByConversation.set(id, [])
    }
  }

  const appendMessage = (conversationId: string, message: ChatMessage) => {
    const list = messagesByConversation.get(conversationId) ?? []
    list.push({ ...message, conversationId })
    messagesByConversation.set(conversationId, list)
    const conversation = conversations.get(conversationId)
    if (conversation) {
      conversation.lastMessageAt = message.createdAt ?? nowIso()
    }
  }

  /**
   * POST a turn to the proxy and adapt the NDJSON response into a `ChatMessageChunk` stream.
   * Every parsed chunk is forwarded unchanged; the assistant text is accumulated and persisted
   * (via `appendMessage`) on `finish` so the thread survives a conversation switch. The upstream
   * `signal` aborts the request; cancelling the returned stream cancels the reader.
   */
  const streamFromProxy = async (
    body: unknown,
    conversationId: string,
    signal: AbortSignal,
  ): Promise<ReadableStream<ChatMessageChunk>> => {
    let response: Response
    try {
      response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (error) {
      // A caller-initiated abort is a normal stop; anything else is a network failure.
      if (signal.aborted) throw error
      throw new Error(t`ai_chat_error_network`)
    }
    if (!response.ok || !response.body) {
      throw new Error(errorMessageForStatus(response.status))
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined

    return new ReadableStream<ChatMessageChunk>({
      async start(controller) {
        reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantMessageId: string | undefined
        let assistantText = ''

        const handleChunk = (chunk: ChatMessageChunk) => {
          controller.enqueue(chunk)
          if (chunk.type === 'start') {
            assistantMessageId = chunk.messageId
          } else if (chunk.type === 'text-delta') {
            assistantText += chunk.delta
          } else if (chunk.type === 'finish' && !assistantMessageId) {
            assistantMessageId = chunk.messageId
          }
        }

        // One event per line: the proxy emits single-line `data: <json>` SSE events, so
        // splitting on newlines is sufficient (blank separator lines are skipped, `:`-prefixed
        // SSE comments/heartbeats are ignored, bare JSON lines are accepted as NDJSON).
        const flushLine = (line: string) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) return
          const payload = trimmed.startsWith('data:')
            ? trimmed.slice('data:'.length).trim()
            : trimmed
          if (payload) {
            handleChunk(JSON.parse(payload) as ChatMessageChunk)
          }
        }

        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let newlineIndex = buffer.indexOf('\n')
            while (newlineIndex !== -1) {
              flushLine(buffer.slice(0, newlineIndex))
              buffer = buffer.slice(newlineIndex + 1)
              newlineIndex = buffer.indexOf('\n')
            }
          }
          flushLine(buffer)
        } catch (error) {
          // A caller-initiated abort is a normal stop, not a stream error.
          if (signal.aborted) {
            controller.close()
          } else {
            console.error('AI chat stream error:', error)
            controller.error(new Error(t`ai_chat_error_generic`))
          }
          return
        }

        if (assistantMessageId && assistantText) {
          appendMessage(conversationId, {
            id: assistantMessageId,
            role: 'assistant',
            parts: [{ type: 'text', text: assistantText }],
            createdAt: nowIso(),
          })
        }
        controller.close()
      },
      async cancel() {
        await reader?.cancel().catch(() => undefined)
      },
    })
  }

  return {
    async listConversations() {
      const list = [...conversations.values()].sort((a, b) =>
        (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''),
      )
      return { conversations: list, hasMore: false }
    },

    async listMessages({ conversationId }) {
      return {
        messages: messagesByConversation.get(conversationId) ?? [],
        hasMore: false,
      }
    },

    async sendMessage({ conversationId, message, messages, signal }) {
      // A brand-new conversation is only created optimistically in the store;
      // its first send is what makes it "real" here.
      const id = conversationId ?? crypto.randomUUID()
      registerConversation(id, getMessageText(message))
      appendMessage(id, message)
      return streamFromProxy(
        { conversationId: id, message, messages, user: getUser() ?? undefined },
        id,
        signal,
      )
    },

    async regenerate({ conversationId, message, messages, signal }) {
      // Backend has no regenerate endpoint; resending the history is the mechanism. The user
      // turn is already in `messages`, so it is not appended again.
      const id = conversationId ?? crypto.randomUUID()
      registerConversation(id, getMessageText(message))
      return streamFromProxy(
        { conversationId: id, message, messages, user: getUser() ?? undefined },
        id,
        signal,
      )
    },
  }
}
