import { NextResponse } from 'next/server'
import { PrismaClient, Publication } from '@prisma/client'

export const GET = async () => {
  const prisma = new PrismaClient()
  try {
    const publications: Publication[] = await prisma.publication.findMany()
    return NextResponse.json(publications)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
