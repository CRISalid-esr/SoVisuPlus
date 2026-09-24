import { NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { requireSession } from '@/app/auth/requireSession'

export const GET = async (
  request: Request,
  context: { params: Promise<{ uid: string }> },
) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const { uid } = await context.params

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
