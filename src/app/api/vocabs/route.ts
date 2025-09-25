import { NextRequest } from 'next/server'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const q = urlParams.get('q') || ''
  const vocabs = urlParams.get('vocabs') || ''
  const lang = urlParams.get('lang') || ''
  const fields = urlParams.get('fields') || ''
  const display_langs = urlParams.get('display_langs') || ''
  const display_fields = urlParams.get('display_fields') || ''
  const limit = urlParams.get('limit') || '20'
  //const limitNumber = parseInt(limit, 10) || 20
  const offset = urlParams.get('offset') || '0'
  //const offsetNumber = parseInt(offset, 10) || 0
  const highlight = urlParams.get('highlight') || 'false'
  const broader = urlParams.get('broader') || 'ids'
  const narrower = urlParams.get('narrower') || 'ids'
  const broader_depth = urlParams.get('broader_depth') || '1'
  //const broader_depthNumber = parseInt(broader_depth, 10) || 1
  const narrower_depth = urlParams.get('narrower_depth') || '1'
  //const narrower_depthNumber = parseInt(narrower_depth, 10) || 1

  const vocabsUrl = process.env.VOCABS_URL!
  const params = new URLSearchParams({
    q: q,
    vocabs: vocabs,
    lang: lang,
    fields: fields,
    display_langs: display_langs,
    display_field: display_fields,
    limit: limit,
    offset: offset,
    highlight: highlight,
    broader: broader,
    narrower: narrower,
    broader_depth: broader_depth,
    narrower_depth: narrower_depth,
  })
  return await fetch(vocabsUrl + params, {
    method: 'GET',
    headers: { 'Content-Type': 'x-www-form-urlencoded' },
  })
}
