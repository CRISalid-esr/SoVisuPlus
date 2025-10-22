import { NextRequest, NextResponse } from 'next/server'
import { VocabSearchService } from '@/lib/services/VocabSearchService'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const q = urlParams.get('q') || ''
  const vocabs = urlParams.get('vocabs')?.split(',') || []
  const limit = urlParams.get('limit') || '20'
  const display_langs = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES

  const limitNumber = parseInt(limit, 10)

  if (!q) {
    return NextResponse.json(
      { error: 'Invalid query string.' },
      { status: 400 },
    )
  } else if (
    Number.isNaN(limitNumber) ||
    limitNumber <= 0 ||
    limitNumber > 100
  ) {
    return NextResponse.json(
      { error: 'Invalid limit value : must be an integer between 1 and 100.' },
      { status: 400 },
    )
  }

  const vocabsSearchService = new VocabSearchService()

  try {
    const response = await vocabsSearchService.suggest(
      q,
      vocabs,
      limitNumber,
      display_langs,
    )
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return NextResponse.json(
      { error: 'Error fetching keywords' },
      { status: 500 },
    )
  }
}
