import { NextRequest, NextResponse } from 'next/server'
import { VocabSearchService } from '@/lib/services/VocabSearchService'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const q = urlParams.get('q') || ''
  const vocabs = urlParams.get('vocabs')?.split(',') || []
  const display_langs = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES

  if (!q) {
    return NextResponse.json(
      { error: 'Invalid query string.' },
      { status: 400 },
    )
  }

  const vocabsSearchService = new VocabSearchService()

  try {
    const response = await vocabsSearchService.suggest(q, vocabs, display_langs)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return NextResponse.json(
      { error: 'Error fetching keywords' },
      { status: 500 },
    )
  }
}
