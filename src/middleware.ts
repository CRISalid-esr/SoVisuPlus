import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware'

// Define supported locales and the default locale
const PUBLIC_FILE = /\.(.*)$/
const supportedLocales = ['en', 'fr']
const defaultLocale = 'fr'

// Protected routes (e.g., dashboard, settings)
const protectedRoutes = ['/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public files and API routes
  if (PUBLIC_FILE.test(pathname) || pathname.includes('/_next')) {
    return
  }

  // Extract the first segment of the pathname to check for the locale
  const pathLocale = pathname.split('/')[1]
  const pathWithoutLocale = pathname.replace(`/${pathLocale}`, '')

  // Protect routes that require authentication
  if (protectedRoutes.some((route) => pathWithoutLocale.startsWith(route))) {
    // Check if the user is authenticated
    if (!request.cookies.get('next-auth.session-token')) {
      const url = request.nextUrl.clone()
      url.pathname = '/' // Redirect to the sign-in page
      return NextResponse.redirect(url)
    }
  } else {
    if (request.cookies.get('next-auth.session-token')) {
      const url = request.nextUrl.clone()
      url.pathname = `${pathLocale}/dashboard` // Redirect to the dashboard
      return NextResponse.redirect(url)
    }
  }

  // If the locale is not supported or missing, redirect to the default locale
  if (!supportedLocales.includes(pathLocale)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    return NextResponse.redirect(url)
  }

  // Proceed if the locale is valid
  return NextResponse.next()
}
