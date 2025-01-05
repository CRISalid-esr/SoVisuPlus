import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth' // Assuming you are using NextAuth
import authOptions from '@/app/auth/auth_options'

export const GET = async () => {
  try {
    // Get the session to identify the connected user
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      )
    }

    // Fetch the connected user's data from the database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }, // Match by email or any unique identifier
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
