import { NextRequest, NextResponse } from 'next/server'
import { VocabsSearchService } from '@/lib/services/VocabsSearchService'

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

  const vocabsSearchService = new VocabsSearchService()

  try {
    const keywords = await vocabsSearchService.suggest(q, vocabs, display_langs)
    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return NextResponse.json(
      { error: 'Error fetching keywords' },
      { status: 500 },
    )
  }
}
