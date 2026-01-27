import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { AgentType, agentTypeFromString } from '@/types/IAgent'

export const GET = async (req: NextRequest) => {
  try {
    const urlParams = req.nextUrl.searchParams
    const contributorUid = urlParams.get('contributorUid') || ''
    const contributorType: AgentType | null = agentTypeFromString(
      urlParams.get('contributorType'),
    )

    if (!contributorType) {
      return NextResponse.json(
        { error: 'Invalid contributorType' },
        { status: 400 },
      )
    }
    const documentService = new DocumentService()
    const { publicationsPerYear } = await documentService.documentsPerYear(
      contributorUid,
      contributorType,
    )

    return NextResponse.json({
      documents: publicationsPerYear,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Error fetching documents' },
      { status: 500 },
    )
  }
}
