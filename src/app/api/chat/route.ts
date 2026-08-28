import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { CrisalidAgentsChatClient } from '@/lib/services/CrisalidAgentsChatClient'

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
    // Forwarded verbatim: `{ conversationId?, message, messages }`. The backend rebuilds
    // context from this body each turn (it is stateless).
    const body = await request.json()
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
