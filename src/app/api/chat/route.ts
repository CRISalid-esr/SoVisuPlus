import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { requireSession } from '@/app/auth/requireSession'
import { KeycloakTokenService } from '@/lib/services/KeycloakTokenService'
import { CrisalidAgentsChatClient } from '@/lib/services/CrisalidAgentsChatClient'
import { chatConfigService } from '@/lib/services/ChatConfigService'

/**
 * Backend proxy for the Crisalid Agents chat API. Keeps the browser from calling the agents
 * backend directly (it has no CORS and is server-to-server only). A logged-in user is required,
 * and the call upstream is made on their behalf: the signed-in person's Keycloak access token,
 * obtained from `KeycloakTokenService` with the session id of the NextAuth JWT, is forwarded as
 * `Authorization: Bearer`. The agents backend resolves "me"/"my" from the token's claims. Without
 * a usable access token (unknown session, or the refresh token expired with the Keycloak session)
 * the route answers `401 {error: 'reauthentication_required'}`; the widget invites the person to
 * sign in again while the rest of the application keeps working on the NextAuth session.
 *
 * Token lifetime: the backend refuses a token with less than two minutes left
 * (`401 {error: 'token_expiring'}`). The route refreshes the token ahead of that window before
 * calling upstream, and on `token_expiring` forces one refresh and retries once.
 *
 * The upstream response (NDJSON, one chunk per line) is re-framed as Server-Sent Events
 * (`data: <json>\n\n`, `text/event-stream`) before being streamed to the client. The payloads
 * are unchanged — only the framing differs. Reverse proxies in front of the deployment buffer
 * generic streamed responses (measured: 4 KB packs every ~1.2 s through the university front,
 * which also rewrites `Cache-Control`, so response headers cannot disable its buffering), but
 * pass `text/event-stream` through unbuffered — the same path OpenWebUI streams over.
 */

// Never cache or buffer the streamed response.
export const dynamic = 'force-dynamic'

const reauthenticationRequired = () =>
  NextResponse.json({ error: 'reauthentication_required' }, { status: 401 })

/**
 * Re-frames the upstream NDJSON stream as SSE: each non-empty line becomes one
 * `data: <json>\n\n` event. Lines split across network chunks are buffered until complete.
 */
const ndjsonToSse = (): TransformStream<Uint8Array, Uint8Array> => {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  const frame = (line: string) => encoder.encode(`data: ${line}\n\n`)
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (line) controller.enqueue(frame(line))
        newlineIndex = buffer.indexOf('\n')
      }
    },
    flush(controller) {
      const line = (buffer + decoder.decode()).trim()
      if (line) controller.enqueue(frame(line))
    },
  })
}

/** True for the backend's "fewer than two minutes left on the token" refusal. */
const isTokenExpiring = async (upstream: Response): Promise<boolean> => {
  if (upstream.status !== 401) return false
  try {
    const payload = await upstream.clone().json()
    return payload?.error === 'token_expiring'
  } catch {
    return false
  }
}

export const POST = async (request: NextRequest) => {
  // Same gate as the widget (CHAT_ENABLED, agents URL, chat config): refuse before touching the
  // session or the upstream.
  if (!(await chatConfigService.isChatEnabled())) {
    return NextResponse.json({ error: 'AI chat is disabled' }, { status: 404 })
  }

  const { error: authError } = await requireSession()
  if (authError) return authError

  // The service refreshes the access token when it is about to expire.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })
  if (!token?.sid) return reauthenticationRequired()
  const tokenService = new KeycloakTokenService()
  let accessToken = await tokenService.getSessionAccessToken(token.sid)
  if (!accessToken) return reauthenticationRequired()

  try {
    // Forwarded (mostly) verbatim: `{ conversationId?, message, messages }`. The backend rebuilds
    // context from this body each turn (it is stateless). Any `user` field is ignored.
    const body = await request.json()
    delete body.user

    // The configured system prompt (shapes agent behaviour), if any. The agents API has no
    // dedicated field, so it is prepended as a `role:"system"` message (honoured, layered after
    // the agent's own prompt). The client rebuilds `messages` each turn without it, so there is
    // no accumulation.
    const systemPrompt = await chatConfigService.getSystemPrompt()
    const systemMessages = systemPrompt
      ? [
          {
            role: 'system',
            parts: [{ type: 'text', text: systemPrompt }],
          },
        ]
      : []

    body.messages = [
      ...systemMessages,
      ...(Array.isArray(body.messages) ? body.messages : []),
    ]

    const client = new CrisalidAgentsChatClient()
    let upstream = await client.streamChat(body, accessToken, request.signal)
    if (await isTokenExpiring(upstream)) {
      // One forced refresh and one retry; a second refusal means the person must sign in again.
      accessToken = await tokenService.getSessionAccessToken(token.sid, {
        forceRefresh: true,
      })
      if (!accessToken) return reauthenticationRequired()
      upstream = await client.streamChat(body, accessToken, request.signal)
      if (await isTokenExpiring(upstream)) return reauthenticationRequired()
    }
    if (!upstream.ok) {
      // Error responses are not streams — pass them through untouched so the client
      // can map the status code to a user-facing message.
      return new Response(upstream.body, { status: upstream.status })
    }
    return new Response(upstream.body?.pipeThrough(ndjsonToSse()) ?? null, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        // Belt and braces alongside the SSE content type: `X-Accel-Buffering: no`
        // disables nginx per-response proxy buffering (consumed by the first nginx
        // hop); `no-transform` forbids intermediaries from compressing (gzip
        // buffers) or otherwise transforming the stream.
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('❌ Error proxying chat request:', error)
    return NextResponse.json(
      { error: 'Failed to reach the agents backend' },
      { status: 502 },
    )
  }
}
