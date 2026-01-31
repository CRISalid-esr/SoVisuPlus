import { NextRequest, NextResponse } from 'next/server'
import * as process from 'node:process'

export async function GET(req: NextRequest) {
  // CCSD cas returns users to //user/login?authType=ORCID&url=/ unfortunately
  // if they choose to log in via ORCID.
  // So we have to handle this route to avoid a 404.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl)
    return new NextResponse('NEXT_PUBLIC_BASE_URL is not set', { status: 500 })

  // Hardcode fr as we do not have locale info here
  const accountUrl = `${baseUrl}/fr/account`

  const authType = req.nextUrl.searchParams.get('authType')
  if (authType && authType.toUpperCase() !== 'CAS') {
    // e.g. ORCID chosen in CCSD CAS UI
    return NextResponse.redirect(
      `${accountUrl}?error=hal_authentication_failure_wrong_protocol`,
    )
  }

  // If someone hits /user/login without authType (??), treat as wrong flow too
  return NextResponse.redirect(
    `${accountUrl}?error=hal_authentication_failure_wrong_protocol`,
  )
}
