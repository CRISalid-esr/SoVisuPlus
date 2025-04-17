import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import {
  PersonIdentifierType as DbPersonIdentifierType,
  User as DbUser,
} from '@prisma/client'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { User } from '@/types/User'

export const GET = async () => {
  try {
    // Get the session to identify the connected user
    const session = (await getServerSession(authOptions)) as Session & {
      user: { username?: string; orcid?: string; id?: string }
    }

    let electedIdentifier: PersonIdentifier | null = null

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      )
    }

    if (session?.user.username) {
      electedIdentifier = {
        type: PersonIdentifierType.LOCAL,
        value: session?.user.username,
      }
    } else if (session?.user.orcid) {
      electedIdentifier = {
        type: PersonIdentifierType.ORCID,
        value: session?.user.orcid,
      }
    }

    if (!electedIdentifier) {
      return NextResponse.json(
        { error: 'No valid identifier found' },
        { status: 400 },
      )
    }

    const user: DbUser | null = await prisma.user.findFirst({
      where: {
        person: {
          identifiers: {
            some: {
              type: electedIdentifier.type.toUpperCase() as DbPersonIdentifierType,
              value: electedIdentifier.value,
            },
          },
        },
      },
      include: { person: { include: { identifiers: true } } },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create a User object from the database user
    const connectedUser = User.fromDbUser(user)
    return NextResponse.json(connectedUser)
  } catch (error) {
    console.error('Error fetching connected user:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
