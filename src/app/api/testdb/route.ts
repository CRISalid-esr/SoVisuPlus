import { NextResponse } from 'next/server'
import { PrismaClient, User } from '@prisma/client'

export const GET = async () => {
  const prisma = new PrismaClient()
  try {
    const users: User[] = await prisma.user.findMany()
    return NextResponse.json(users)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
