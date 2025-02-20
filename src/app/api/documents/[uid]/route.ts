import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma' // Ensure Prisma is set up correctly
import { DocumentService } from '@/lib/services/DocumentService'

export async function GET(
  request: Request,
  { params }: { params: { uid: string } },
) {
  const { uid } = params

  if (!uid) {
    return NextResponse.json(
      { error: 'Document UID is required' },
      { status: 400 },
    )
  }

  try {
    const documentService = new DocumentService()
    const document = await documentService.fetchDocumentById(uid)
    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
