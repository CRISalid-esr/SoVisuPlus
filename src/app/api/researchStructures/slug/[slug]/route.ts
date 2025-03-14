import { NextRequest, NextResponse } from 'next/server'
import { ResearchStructureService } from '@/lib/services/ResearchStructureService'

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await context.params
  const researchStructureService = new ResearchStructureService()

  try {
    const researchStructure =
      await researchStructureService.fetchResearchStructureBySlug(slug)
    if (!researchStructure) {
      return NextResponse.json(
        { error: `ResearchStructure with slug ${slug} not found` },
        { status: 404 },
      )
    }

    return NextResponse.json(researchStructure)
  } catch (error) {
    console.error(`Error fetching research structure by slug: ${slug}`, error)
    return NextResponse.json(
      { error: 'Failed to fetch research structure by slug' },
      { status: 500 },
    )
  }
}
