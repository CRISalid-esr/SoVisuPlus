import { NextRequest, NextResponse } from 'next/server'
import { ResearchStructureService } from '@/lib/services/ResearchStructureService'

const researchStructureService = new ResearchStructureService()

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = urlParams.get('page') || '1'
  const pageNumber = parseInt(page, 10) || 1
  const itemsPerPage = 10

  try {
    const { researchStructures, total } =
      await researchStructureService.getResearchStructures({
        searchTerm,
        pageNumber,
        itemsPerPage,
      })

    return NextResponse.json({
      researchStructures,
      total,
      hasMore: total > pageNumber * itemsPerPage,
    })
  } catch (error) {
    console.error('Error fetching research structures:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
