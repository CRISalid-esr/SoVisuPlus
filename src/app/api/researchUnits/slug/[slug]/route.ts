import { NextRequest, NextResponse } from 'next/server'
import { ResearchUnitService } from '@/lib/services/ResearchUnitService'

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await context.params
  const researchUnitService = new ResearchUnitService()

  try {
    const researchUnit = await researchUnitService.fetchResearchUnitBySlug(slug)
    if (!researchUnit) {
      return NextResponse.json(
        { error: `ResearchUnit with slug ${slug} not found` },
        { status: 404 },
      )
    }

    return NextResponse.json(researchUnit)
  } catch (error) {
    console.error(`Error fetching research unit by slug: ${slug}`, error)
    return NextResponse.json(
      { error: 'Failed to fetch research unit by slug' },
      { status: 500 },
    )
  }
}
