import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { AgentType, agentTypeFromString } from '@/types/IAgent'

export const GET = async (req: NextRequest) => {
  try {
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const searchlang =
      urlParams.get('searchLang') ||
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')[0] ||
      ''
    // The tabs share the search term but keep their own column filters, so
    // each badge is counted against its own tab's set.
    const allDocumentsFilters = JSON.parse(
      urlParams.get('allDocumentsFilters') || '[]',
    )
    const outsideHalFilters = JSON.parse(
      urlParams.get('outsideHalFilters') || '[]',
    )
    const contributorUid = urlParams.get('contributorUid') || ''
    const contributorType: AgentType | null = agentTypeFromString(
      urlParams.get('contributorType'),
    )
    const halCollectionCodes = JSON.parse(
      urlParams.get('halCollectionCodes') || '[]',
    )

    if (!contributorType) {
      return NextResponse.json(
        { error: 'Invalid contributorType' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    const { allItems, outsideHalItems } = await documentService.countDocuments({
      searchTerm,
      searchLang: searchlang,
      allDocumentsFilters,
      outsideHalFilters,
      contributorUid,
      contributorType,
      halCollectionCodes,
    })

    return NextResponse.json({
      allItems,
      outsideHalItems,
    })
  } catch (error) {
    console.error('Error counting documents:', error)
    return NextResponse.json(
      { error: 'Error counting documents' },
      { status: 500 },
    )
  }
}
