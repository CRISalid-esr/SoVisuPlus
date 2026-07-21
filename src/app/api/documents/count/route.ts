import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { AgentType, agentTypeFromString } from '@/types/IAgent'

export const GET = async (req: NextRequest) => {
  try {
    // These counts feed the tab badges, which are perspective totals: the
    // table's search term and column filters are deliberately not applied.
    const urlParams = req.nextUrl.searchParams
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
    const { allItems, incompleteHalRepositoryItems, outsideHalItems } =
      await documentService.countDocuments({
        contributorUid,
        contributorType,
        halCollectionCodes,
      })

    return NextResponse.json({
      allItems,
      incompleteHalRepositoryItems,
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
