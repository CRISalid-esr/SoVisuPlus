import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { CrisalidAgentsChatClient } from '@/lib/services/CrisalidAgentsChatClient'
import { chatConfigService } from '@/lib/services/ChatConfigService'

/**
 * Backend proxy for the Crisalid Agents chat API. Keeps the browser from calling the agents
 * backend directly (it has no CORS and is server-to-server only) and keeps the secret
 * `CRISALID_AGENTS_API_KEY` on the server. Auth-only: a logged-in user is required to avoid an
 * open relay.
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

type SessionUser = {
  username?: string
  name?: string | null
  personUid?: string | null
}

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

/**
 * A one-line, machine-and-human readable description of the signed-in user, for the agent to scope
 * "me"/"my" queries to the right person in the knowledge graph. Built from the trusted session.
 */
const buildUserContext = (user: SessionUser): string => {
  const parts = [`username: "${user.username}"`]
  if (user.name) parts.push(`name: "${user.name}"`)
  parts.push(
    user.personUid
      ? `person UID: ${user.personUid}`
      : 'person UID: (unavailable)',
  )
  return (
    `Current signed-in user — ${parts.join(', ')}. ` +
    `When the user says "me", "my", or "I", it refers to this person; use the person UID to ` +
    `scope knowledge-graph queries about them.`
  )
}

export const POST = async (request: NextRequest) => {
  const session = (await getServerSession(authOptions)) as Session & {
    user: {
      username?: string
      name?: string | null
      personUid?: string | null
    }
  }
  if (!session?.user?.username) {
    return NextResponse.json(
      { error: 'User is not authenticated' },
      { status: 401 },
    )
  }

  try {
    // Forwarded (mostly) verbatim: `{ conversationId?, message, messages }`. The backend rebuilds
    // context from this body each turn (it is stateless).
    const body = await request.json()

    // System context injected server-side. The agents API has no dedicated fields, so both are
    // prepended as `role:"system"` messages (honoured, layered after the agent's own prompt). The
    // client rebuilds `messages` each turn without them, so there is no accumulation.
    const systemMessages: {
      role: 'system'
      parts: { type: 'text'; text: string }[]
    }[] = []

    // 1) The configured system prompt (shapes agent behaviour), if any.
    const systemPrompt = await chatConfigService.getSystemPrompt()
    if (systemPrompt) {
      systemMessages.push({
        role: 'system',
        parts: [{ type: 'text', text: systemPrompt }],
      })
    }

    // 2) The signed-in user's identity, from the trusted session — lets the agent resolve
    //    "me"/"my" and scope knowledge-graph queries to this person.
    systemMessages.push({
      role: 'system',
      parts: [{ type: 'text', text: buildUserContext(session.user) }],
    })

    body.messages = [
      ...systemMessages,
      ...(Array.isArray(body.messages) ? body.messages : []),
    ]

    const upstream = await new CrisalidAgentsChatClient().streamChat(
      body,
      request.signal,
    )
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
