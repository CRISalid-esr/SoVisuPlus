/**
 * Thin HTTP layer over the Crisalid Agents `chat_api` (`POST /chat`). The only class that
 * performs network I/O against that backend. No database access, no domain logic.
 *
 * The base URL comes from `NEXT_PUBLIC_CRISALID_AGENTS_API_URL` (e.g. `http://localhost:9100`
 * or the internal `http://crisalid-agents-chat-api:9100`); the `/chat` endpoint path is
 * appended here, so the env var holds only the base. The API key (`CRISALID_AGENTS_API_KEY`)
 * is optional: it is injected here, server-side only, so it never reaches the browser — the
 * client-side chat adapter talks to our own `/api/chat` proxy, which calls this. When no key is
 * configured we send the request without one and let the agent backend enforce (or waive)
 * authorization; its own `ENABLE_API_KEYS` toggle decides whether a key is required.
 *
 * The backend streams `application/x-ndjson`; `streamChat` returns the raw upstream `Response`
 * so the caller can pass its `.body` straight through without buffering.
 */
export class CrisalidAgentsChatClient {
  private readonly chatUrl: string
  private readonly apiKey: string | undefined

  constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_CRISALID_AGENTS_API_URL
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_CRISALID_AGENTS_API_URL is not configured')
    }
    // The env var is a base URL; the endpoint path lives in code.
    this.chatUrl = `${baseUrl.replace(/\/+$/, '')}/chat`
    // Optional — omitted from the request when unset; the backend decides if it is required.
    this.apiKey = process.env.CRISALID_AGENTS_API_KEY || undefined
  }

  /**
   * POST a chat turn upstream and return the raw streaming response. `body` is forwarded
   * verbatim (`{ conversationId?, message, messages }`); `signal` lets a client disconnect
   * abort the upstream request.
   */
  async streamChat(body: unknown, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey
    }
    return fetch(this.chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  }
}
