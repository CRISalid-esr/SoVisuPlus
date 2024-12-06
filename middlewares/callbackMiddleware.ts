import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CustomMiddleware } from '@/middlewares/chain'

export function callbackMiddleware(middleware: CustomMiddleware) {
  return async (request: NextRequest, event: NextFetchEvent) => {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')

    if (callbackUrl) {
      const decodedUrl = decodeURIComponent(callbackUrl)
      const url = request.nextUrl.clone()
      url.pathname = decodedUrl
      url.searchParams.delete('callbackUrl')
      return NextResponse.redirect(url)
    }
    return middleware(request, event, NextResponse.next())
  }
}
