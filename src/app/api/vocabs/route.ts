import { NextRequest, NextResponse } from 'next/server'
import { VocabSearchService } from '@/lib/services/VocabSearchService'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const q = urlParams.get('q') || ''
  const vocabs = urlParams.get('vocabs')?.split(',') || []
  const display_langs = 'fr,en' //navigator.languages.join()

  if (!q) {
    return NextResponse.json(
      { error: 'Invalid query string.' },
      { status: 400 },
    )
  }

  const vocabsSearchService = new VocabSearchService()

  try {
    return await vocabsSearchService.suggest(q, vocabs, display_langs)
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return NextResponse.json(
      { error: 'Error fetching keywords' },
      { status: 500 },
    )
  }
}
