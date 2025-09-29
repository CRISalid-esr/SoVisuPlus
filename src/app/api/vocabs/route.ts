import { NextRequest } from 'next/server'
import { VocabsSearchService } from '@/lib/services/VocabsSearchService'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const q = urlParams.get('q') || ''
  const vocabs = urlParams.get('vocabs')?.split(',') || []
  const langs = urlParams.get('lang')?.split(',') || []
  const fields = urlParams.get('fields')?.split(',') || []
  const display_langs = urlParams.get('display_langs')?.split(',') || []
  const display_fields = urlParams.get('display_fields')?.split(',') || [
    'search_all',
  ]
  const limit = Number(urlParams.get('limit') || '20')
  const offset = Number(urlParams.get('offset') || '0')
  const highlight = urlParams.get('highlight') || 'false'
  const broader = urlParams.get('broader') || 'ids'
  const narrower = urlParams.get('narrower') || 'ids'

  const broader_depthNumber = Number(urlParams.get('broader_depth') || '1')
  const narrower_depthNumber = Number(urlParams.get('narrower_depth') || '1')

  const vocabsSearchService = new VocabsSearchService(
    q,
    vocabs,
    langs,
    fields,
    display_langs,
    display_fields,
    limit,
    offset,
    highlight,
    broader,
    narrower,
    broader_depthNumber,
    narrower_depthNumber,
  )

  return vocabsSearchService.getResult()
}
