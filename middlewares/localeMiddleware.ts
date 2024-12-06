import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CustomMiddleware } from '@/middlewares/chain'

// Define supported locales and the default locale
const PUBLIC_FILE = /\.(.*)$/
const supportedLocales = ['en', 'fr']
const defaultLocale = 'fr'

export function localeMiddleware(middleware: CustomMiddleware) {
  return async (request: NextRequest, event: NextFetchEvent) => {
    const { pathname } = request.nextUrl
    const response = NextResponse.next()
    // Skip public files and API routes
    if (PUBLIC_FILE.test(pathname) || pathname.includes('/_next')) {
      return
    }

    // Extract the first segment of the pathname to check for the locale
    const pathLocale = pathname.split('/')[1]

    // If the locale is not supported or missing, redirect to the default locale
    if (!supportedLocales.includes(pathLocale)) {
      const url = request.nextUrl.clone()
      url.pathname = `/${defaultLocale}${pathname}`
      return NextResponse.redirect(url)
    }

    // Proceed if the locale is valid
    return middleware(request, event, response)
  }
}
