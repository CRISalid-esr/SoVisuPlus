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

type ClientUser = {
  firstName?: string
  lastName?: string
  uid?: string
}

type SessionUser = {
  username?: string
  name?: string | null
  personUid?: string | null
}

/**
 * A one-line, machine-and-human readable description of the signed-in user, for the agent to scope
 * "me"/"my" queries to the right person in the knowledge graph. Prefers the identity the client
 * read from the store (person firstName/lastName/uid), falling back to the session.
 */
const buildUserContext = (
  client: ClientUser | undefined,
  session: SessionUser,
): string => {
  const displayName = [client?.firstName, client?.lastName]
    .filter((part) => part && part.trim())
    .join(' ')
    .trim()
  const name = displayName || session.name || session.username || 'unknown'
  const uid = client?.uid || session.personUid || undefined
  return (
    `Current signed-in user — name: "${name}", ` +
    `${uid ? `person UID: ${uid}` : 'person UID: (unavailable)'}. ` +
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
    // context from this body each turn (it is stateless). `user` (the store's connected-user
    // identity) is consumed here to build the prompt and is not forwarded.
    const body = await request.json()
    const clientUser: ClientUser | undefined = body.user
    delete body.user

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

    // 2) The signed-in user's identity (name + person UID) — lets the agent resolve "me"/"my"
    //    and scope knowledge-graph queries to this person.
    systemMessages.push({
      role: 'system',
      parts: [{ type: 'text', text: buildUserContext(clientUser, session.user) }],
    })

    body.messages = [
      ...systemMessages,
      ...(Array.isArray(body.messages) ? body.messages : []),
    ]

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
