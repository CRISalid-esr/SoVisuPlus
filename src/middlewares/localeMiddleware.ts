import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CustomMiddleware } from '@/middlewares/chain'
import process from 'process'

export function localeMiddleware(middleware: CustomMiddleware) {
  return async (request: NextRequest, event: NextFetchEvent) => {
    let supportedLocales: string[] = []
    if (process.env.SUPPORTED_LOCALES) {
      console.log('SUPPORTED LOCALES:', process.env.SUPPORTED_LOCALES)
      supportedLocales = process.env.SUPPORTED_LOCALES.split(',')
    } else {
      console.error('SUPPORTED_LOCALES environment variable is not set')
      supportedLocales = ['fr', 'en']
    }

    const defaultLocale = supportedLocales[0]
    const { pathname } = request.nextUrl
    const response = NextResponse.next()
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
