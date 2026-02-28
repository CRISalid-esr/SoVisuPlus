import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CustomMiddleware } from '@/middlewares/chain'
import process from 'process'

export const localeMiddleware =
  (middleware: CustomMiddleware) =>
  async (request: NextRequest, event: NextFetchEvent) => {
    let supportedLocales: string[] = ['fr', 'en']
    if (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES) {
      const localesFromEnv =
        process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
      if (localesFromEnv) {
        supportedLocales = localesFromEnv
      }
    } else {
      console.error(
        'NEXT_PUBLIC_SUPPORTED_LOCALES environment variable is not set',
      )
    }
    const defaultLocale = supportedLocales[0]
    const { pathname, searchParams } = request.nextUrl
    // CCSD cas returns users to //user/login?authType=ORCID&url=/ unfortunately
    // if they choose to log in via ORCID. So we have to exclude this route from the redirection.
    if (
      pathname.startsWith('/user/login') &&
      searchParams.get('authType') === 'ORCID'
    ) {
      return middleware(request, event, NextResponse.next())
    }
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
