import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { CrisalidAgentsChatClient } from '@/lib/services/CrisalidAgentsChatClient'
import { chatConfigService } from '@/lib/services/ChatConfigService'

/**
 * Backend proxy for the Crisalid Agents chat API. Keeps the browser from calling the agents
 * backend directly (it has no CORS and is server-to-server only) and keeps the secret
 * `CRISALID_AGENTS_API_KEY` on the server. Auth-only: a logged-in user is required to avoid an
 * open relay. The upstream response is streamed (NDJSON) straight through to the client.
 */

// Never cache or buffer the streamed response.
export const dynamic = 'force-dynamic'

export const POST = async (request: NextRequest) => {
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
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

    // Inject the configured system prompt server-side so the browser never sees it. The agents
    // API has no dedicated field; it is prepended as a `role:"system"` message (honoured, but
    // layered after the agent's own prompt). The client rebuilds `messages` each turn without it,
    // so there is no accumulation.
    const systemPrompt = await chatConfigService.getSystemPrompt()
    if (systemPrompt) {
      body.messages = [
        { role: 'system', parts: [{ type: 'text', text: systemPrompt }] },
        ...(Array.isArray(body.messages) ? body.messages : []),
      ]
    }

    const upstream = await new CrisalidAgentsChatClient().streamChat(
      body,
      request.signal,
    )
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
  } catch (error) {
    console.error('❌ Error proxying chat request:', error)
    return NextResponse.json(
      { error: 'Failed to reach the agents backend' },
      { status: 502 },
    )
  }
}
