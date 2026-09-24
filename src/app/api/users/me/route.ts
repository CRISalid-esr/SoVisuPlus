import { NextResponse } from 'next/server'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { UserService } from '@/lib/services/UserService'
import { requireSession } from '@/app/auth/requireSession'

export const GET = async () => {
  try {
    const { session, error: authError } = await requireSession()
    if (authError) return authError

    const userService = new UserService()
    const connectedUser = await userService.getUserByPersonIdentifier(
      new PersonIdentifier(PersonIdentifierType.local, session.user.username),
    )

    if (!connectedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json(connectedUser)
  } catch (error) {
    console.error('Error fetching connected user:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
