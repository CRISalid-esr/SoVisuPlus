import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'

export const GET = async (req: NextRequest) => {
  try {
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const searchlang =
      urlParams.get('searchLang') ||
      process.env.SUPPORTED_LOCALES?.split(',')[0] ||
      ''
    const page = parseInt(urlParams.get('page') || '1', 10)
    const pageSize = parseInt(urlParams.get('pageSize') || '10', 10)
    const columnFilters = JSON.parse(urlParams.get('columnFilters') || '[]')
    const sorting = JSON.parse(urlParams.get('sorting') || '[]')
    const contributorUid = urlParams.get('contributorUid') || ''

    const documentService = new DocumentService()
    const { documents, totalItems } = await documentService.fetchDocuments({
      searchTerm,
      searchLang: searchlang,
      page,
      pageSize,
      columnFilters,
      sorting,
      contributorUid,
    })

    return NextResponse.json({
      documents,
      totalItems,
      page,
      limit: pageSize,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Error fetching documents' },
      { status: 500 },
    )
  }
}
