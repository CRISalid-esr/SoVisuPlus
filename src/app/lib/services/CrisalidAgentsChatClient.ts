/**
 * Thin HTTP layer over the Crisalid Agents `chat_api` (`POST /agents/{name}/chat`). The only
 * class that performs network I/O against that backend. No database access, no domain logic.
 *
 * The base URL comes from `CRISALID_AGENTS_API_URL` (e.g. `http://localhost:9100`
 * or the internal `http://crisalid-agents-chat-api:9100`); the endpoint path is appended
 * here, so the env var holds only the base. The agent to talk to comes from
 * `CRISALID_AGENTS_AGENT` (default `generic_agent`).
 *
 * The backend authenticates the signed-in person, not the SoVisu+ server: each call carries the
 * user's Keycloak access token as `Authorization: Bearer`. The token is read from the NextAuth
 * JWT by the server-side `/api/chat` proxy (the browser never sees it) and passed to
 * `streamChat`. The backend checks its audience and remaining lifetime and answers `401` with
 * `{"error": "token_expiring"}` when fewer than two minutes remain.
 *
 * The backend streams `application/x-ndjson`; `streamChat` returns the raw upstream `Response`
 * so the caller can pass its `.body` straight through without buffering.
 */
const DEFAULT_AGENT = 'generic_agent'

export class CrisalidAgentsChatClient {
  private readonly chatUrl: string

  constructor() {
    const baseUrl = process.env.CRISALID_AGENTS_API_URL
    if (!baseUrl) {
      throw new Error('CRISALID_AGENTS_API_URL is not configured')
    }
    // The env var is a base URL; the endpoint path lives in code.
    const agent = process.env.CRISALID_AGENTS_AGENT || DEFAULT_AGENT
    this.chatUrl = `${baseUrl.replace(/\/+$/, '')}/agents/${encodeURIComponent(agent)}/chat`
  }

  /**
   * POST a chat turn upstream and return the raw streaming response. `body` is forwarded
   * verbatim (`{ conversationId?, message, messages }`); `accessToken` is the user's Keycloak
   * access token; `signal` lets a client disconnect abort the upstream request.
   */
  async streamChat(
    body: unknown,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    return fetch(this.chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  }
}
