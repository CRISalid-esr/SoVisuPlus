import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession, Session } from 'next-auth' // Assuming you are using NextAuth
import authOptions from '@/app/auth/auth_options'
import { AgentIdentifierType as DbAgentIdentifierType } from '@prisma/client'
import { AgentIdentifier } from '@/types/AgentIdentifier'

export const GET = async () => {
  try {
    // Get the session to identify the connected user
    const session = (await getServerSession(authOptions)) as Session & {
      user: { username?: string; orcid?: string }
    }
    //const
    let electedIdentifier: AgentIdentifier | null = null

    console.log('session', session)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      )
    }

    if (session?.user.username) {
      electedIdentifier = {
        type: 'local',
        value: session?.user.username,
      }
    } else if (session?.user.orcid) {
      electedIdentifier = {
        type: 'orcid',
        value: session?.user.orcid,
      }
    }

    if (!electedIdentifier) {
      return NextResponse.json(
        { error: 'No valid identifier found' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        person: {
          identifiers: {
            some: {
              type: electedIdentifier.type.toUpperCase() as DbAgentIdentifierType,
              value: electedIdentifier.value,
            },
          },
        },
      },
      include: { person: true }, // Include associated Person if needed
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching connected user:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
