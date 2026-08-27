import type {
  ChatAdapter,
  ChatConversation,
  ChatMessage,
  ChatMessageChunk,
  ChatRole,
} from '@mui/x-chat-headless'

/**
 * In-memory, multi-conversation `ChatAdapter` used to scaffold the AI chat UI
 * before the real backend exists. It echoes the user's message back.
 *
 * This module is the ONLY data-plane seam: every method maps 1:1 to a future
 * API endpoint (see the `TODO(api)` markers). To go live, replace the method
 * bodies with `fetch` calls — `AiChatWidget.tsx` does not need to change.
 *
 * Note: state lives in closures, so it resets when the widget unmounts.
 */

const defaultRespond = (text: string) =>
  `You said: "${text || 'nothing'}". This is a demo assistant — replace the adapter with the real API.`

const getMessageText = (message: ChatMessage): string =>
  message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')

const nowIso = () => new Date().toISOString()

export interface AiChatSeedConversation {
  /** Stable id; a random one is generated when omitted. */
  id?: string
  title?: string
  messages: { role: ChatRole; text: string }[]
}

export interface CreateAiChatAdapterOptions {
  /** Build the assistant reply from the user's text. */
  respond?: (text: string) => string
  /** Latency before the reply is emitted, in ms. @default 400 */
  delayMs?: number
  /**
   * Conversations to pre-populate (e.g. a "Welcome" thread). At least one
   * conversation is required for the split list / back-arrow UI to engage.
   * TODO(api): the real backend returns these from GET /api/chat/conversations.
   */
  seed?: AiChatSeedConversation[]
}

export function createAiChatAdapter(
  options: CreateAiChatAdapterOptions = {},
): ChatAdapter {
  const respond = options.respond ?? defaultRespond
  const delayMs = options.delayMs ?? 400

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

  // Mirrors createEchoAdapter's streaming shape: a single text part emitted
  // after `delayMs`, honouring the abort signal. On finish it persists the
  // assistant reply so a later `listMessages` returns a coherent history.
  const createReplyStream = (
    conversationId: string,
    userText: string,
    replyId: string,
    signal: AbortSignal,
  ): ReadableStream<ChatMessageChunk> => {
    const reply = respond(userText)
    const partId = `${replyId}-text`
    let timer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
    }

    return new ReadableStream<ChatMessageChunk>({
      start(controller) {
        const handleAbort = () => {
          cleanup()
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
        if (signal.aborted) {
          handleAbort()
          return
        }
        signal.addEventListener('abort', handleAbort, { once: true })
        timer = setTimeout(() => {
          timer = null
          signal.removeEventListener('abort', handleAbort)
          appendMessage(conversationId, {
            id: replyId,
            role: 'assistant',
            parts: [{ type: 'text', text: reply }],
            createdAt: nowIso(),
          })
          controller.enqueue({ type: 'start', messageId: replyId })
          controller.enqueue({ type: 'text-start', id: partId })
          controller.enqueue({ type: 'text-delta', id: partId, delta: reply })
          controller.enqueue({ type: 'text-end', id: partId })
          controller.enqueue({
            type: 'finish',
            messageId: replyId,
            finishReason: 'stop',
          })
          controller.close()
        }, delayMs)
      },
      cancel() {
        cleanup()
      },
    })
  }

  return {
    // TODO(api): GET /api/chat/conversations
    async listConversations() {
      const list = [...conversations.values()].sort((a, b) =>
        (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''),
      )
      return { conversations: list, hasMore: false }
    },

    // TODO(api): GET /api/chat/conversations/:conversationId/messages
    async listMessages({ conversationId }) {
      return {
        messages: messagesByConversation.get(conversationId) ?? [],
        hasMore: false,
      }
    },

    // TODO(api): POST /api/chat/conversations/:conversationId/messages (streamed)
    async sendMessage({ conversationId, message, signal }) {
      const userText = getMessageText(message)
      // A brand-new conversation is only created optimistically in the store;
      // its first send is what makes it "real" here.
      const id = conversationId ?? crypto.randomUUID()
      registerConversation(id, userText)
      appendMessage(id, message)
      return createReplyStream(id, userText, `reply-${message.id}`, signal)
    },

    // TODO(api): POST …/messages with trigger=regenerate-message
    async regenerate({ conversationId, message, signal }) {
      const userText = getMessageText(message)
      const id = conversationId ?? crypto.randomUUID()
      registerConversation(id, userText)
      return createReplyStream(
        id,
        userText,
        `reply-${message.id}-${crypto.randomUUID()}`,
        signal,
      )
    },
  }
}
