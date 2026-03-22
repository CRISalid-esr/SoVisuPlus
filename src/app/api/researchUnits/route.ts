import { NextRequest, NextResponse } from 'next/server'
import { ResearchUnitService } from '@/lib/services/ResearchUnitService'

const researchUnitService = new ResearchUnitService()

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = urlParams.get('page') || '1'
  const pageNumber = parseInt(page, 10) || 1
  const itemsPerPage = 10

  try {
    const { researchUnits, total } = await researchUnitService.getResearchUnits(
      {
        searchTerm,
        pageNumber,
        itemsPerPage,
      },
    )

    return NextResponse.json({
      researchUnits: researchUnits,
      total,
      hasMore: total > pageNumber * itemsPerPage,
    })
  } catch (error) {
    console.error('Error fetching research units:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
