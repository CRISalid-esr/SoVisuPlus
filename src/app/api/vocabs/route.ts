import { NextRequest } from 'next/server'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const q = urlParams.get('q') || ''
  const vocabs = urlParams.get('vocabs') || '' //enum type ?
  const lang = urlParams.get('lang') || '' //enum type ?
  const fields = urlParams.get('fields') || '' //enum type ?
  const display_langs = urlParams.get('display_langs') || '' //enum type ?
  const display_fields = urlParams.get('display_fields') || '' //enum type ?
  const limitNumber = Number(urlParams.get('limit') || '20')
  if (!Number.isInteger(limitNumber)) {
    throw new Error("Invalid parameter 'limit' : must be an integer")
  }
  const limit = (() => {
    if (limitNumber < 1) {
      return '1'
    } else if (limitNumber > 100) {
      return '100'
    } else {
      return limitNumber.toString()
    }
  })()

  const offsetNumber = Number(urlParams.get('offset') || '0')
  if (!Number.isInteger(offsetNumber)) {
    throw new Error("Invalid parameter 'offset' : must be an integer")
  }
  const offset = offsetNumber < 0 ? '0' : offsetNumber.toString()

  const highlight = urlParams.get('highlight') || 'false'
  if (!(highlight === 'true' || highlight === 'false')) {
    throw new Error("Invalid parameter 'highlight' : must be a boolean")
  }

  const broader = urlParams.get('broader') || 'ids' //enum type ?
  if (!(broader === 'ids' || broader === 'full')) {
    throw new Error(
      "Invalid parameter 'broader' : only values 'ids' and 'full' accepted",
    )
  }

  const narrower = urlParams.get('narrower') || 'ids' //enum type ?
  if (!(narrower === 'ids' || narrower === 'full')) {
    throw new Error(
      "Invalid parameter 'narrower' : only values 'ids' and 'full' accepted",
    )
  }

  const broader_depthNumber = Number(urlParams.get('broader_depth') || '1')
  if (!Number.isInteger(broader_depthNumber)) {
    throw new Error(
      "Invalid parameter 'broader_depthNumber' : must be an integer",
    )
  }
  const broader_depth = broader_depthNumber == 1 ? '1' : '-1' //depends on broader ?

  const narrower_depthNumber = Number(urlParams.get('narrower_depth') || '1')
  if (!Number.isInteger(broader_depthNumber)) {
    throw new Error(
      "Invalid parameter 'broader_depthNumber' : must be an integer",
    )
  }
  const narrower_depth = narrower_depthNumber == 1 ? '1' : '-1' //depends on narrower ?

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

  return await fetch(vocabsUrl + '?' + params, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
}
