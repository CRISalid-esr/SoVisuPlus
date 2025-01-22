import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Document } from '@prisma/client'

export const GET = async () => {
  try {
    const documents: Document[] = await prisma.document.findMany()
    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
