import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { AgentType, agentTypeFromString } from '@/types/IAgent'
import { requireSession } from '@/app/auth/requireSession'
import { isHiddenPerspective } from '@/app/auth/structureVisibility'

/** Oldest publication year of a perspective, used to bound the dashboard year range. */
export const GET = async (req: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

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
    if (await isHiddenPerspective(contributorUid, contributorType)) {
      return NextResponse.json(
        { error: `Structure ${contributorUid} not found` },
        { status: 404 },
      )
    }
    const oldestYear = await new DocumentService().oldestPublicationYear(
      contributorUid,
      contributorType,
    )
    return NextResponse.json({ oldestYear })
  } catch (error) {
    console.error('Error fetching oldest publication year:', error)
    return NextResponse.json(
      { error: 'Error fetching oldest publication year' },
      { status: 500 },
    )
  }
}
