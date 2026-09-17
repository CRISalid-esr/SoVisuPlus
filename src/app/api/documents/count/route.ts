import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { AgentType, agentTypeFromString } from '@/types/IAgent'
import { documentSearchQueryLengthError } from '@/utils/fuzzySearch/searchQueryLength'
import { requireSession } from '@/app/auth/requireSession'
import { isHiddenPerspective } from '@/app/auth/structureVisibility'

export const GET = async (req: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  try {
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const searchlang =
      urlParams.get('searchLang') ||
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')[0] ||
      ''
    const columnFilters = JSON.parse(urlParams.get('columnFilters') || '[]')
    const contributorUid = urlParams.get('contributorUid') || ''
    const contributorType: AgentType | null = agentTypeFromString(
      urlParams.get('contributorType'),
    )
    const halCollectionCodes = JSON.parse(
      urlParams.get('halCollectionCodes') || '[]',
    )
    const areHalCollectionCodesOmitted =
      urlParams.get('areHalCollectionCodesOmitted') === 'true'

    if (!contributorType) {
      return NextResponse.json(
        { error: 'Invalid contributorType' },
        { status: 400 },
      )
    }
    if (await isHiddenPerspective(contributorUid, contributorType)) {
      return NextResponse.json(
        { error: `Structure ${contributorUid} not found` },
        { status: 404 },
      )
    }

    const searchLengthError = documentSearchQueryLengthError(
      searchTerm,
      columnFilters,
    )
    if (searchLengthError) {
      return NextResponse.json({ error: searchLengthError }, { status: 400 })
    }

    const documentService = new DocumentService()
    // Same number the list route returns as `totalItems`, for a different set
    // of filters — this endpoint serves the badge of a tab that is not on
    // screen, so no rows are fetched.
    const totalItems = await documentService.countDocuments({
      searchTerm,
      searchLang: searchlang,
      columnFilters,
      contributorUid,
      contributorType,
      halCollectionCodes,
      areHalCollectionCodesOmitted,
    })

    return NextResponse.json({ totalItems })
  } catch (error) {
    console.error('Error counting documents:', error)
    return NextResponse.json(
      { error: 'Error counting documents' },
      { status: 500 },
    )
  }
}
