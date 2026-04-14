import { NextRequest, NextResponse } from 'next/server'
import * as process from 'node:process'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { UserService } from '@/lib/services/UserService'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { PersonService } from '@/lib/services/PersonService'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

export const GET = async (req: NextRequest) => {
  const sovisuplusHost = process.env.NEXT_PUBLIC_BASE_URL
  const lang =
    req.nextUrl.searchParams.get('lang') ??
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')[0]
  const userRedirectionUrl = `${sovisuplusHost}/${lang}/account`
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_authentication_failure_no_code`,
    )
  }
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string; orcid?: string; id?: string }
  }
  if (!session || !session?.user?.id || !session?.user?.username) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_authentication_failure_no_session`,
    )
  }
  const userService = new UserService()
  const user = await userService.getUserByPersonIdentifier(
    new PersonIdentifier(PersonIdentifierType.local, session.user.username),
  )
  if (!user || !user.person) {
    console.error(`User not found for session ID: ${session?.user?.id}`)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_authentication_failure_user_not_found`,
    )
  }

  const ability = abilityFromAuthzContext(session.user.authz)
  if (!ability.can(PermissionAction.update, user.person, 'identifiers')) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_authentication_failure`,
    )
  }

  const clientId = process.env.NEXT_PUBLIC_ORCID_CLIENT_ID!
  const clientSecret = process.env.ORCID_CLIENT_SECRET!
  const redirectUri = `${sovisuplusHost}/api/orcid/callback?lang=${lang}`

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  const orcidUrl = process.env.NEXT_PUBLIC_ORCID_URL!
  const response = await fetch(`${orcidUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    console.error('OAuth token request failed', await response.text())
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_authentication_failure_token_request`,
    )
  }

  const data = await response.json()

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    scope: scopeStr,
    token_type: tokenType,
    orcid,
  } = data

  if (
    !accessToken ||
    !refreshToken ||
    !orcid ||
    !scopeStr ||
    typeof orcid !== 'string' ||
    !expiresIn ||
    typeof expiresIn !== 'number'
  ) {
    console.error('OAuth token response missing fields', data)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_authentication_failure_missing_data`,
    )
  }

  const obtainedAt = new Date()
  const expiresAt = new Date(obtainedAt.getTime() + expiresIn * 1000)

  const scopes = ORCIDIdentifier.parseOrcidScope(scopeStr)

  const orcidIdentifier = new ORCIDIdentifier(orcid, {
    accessToken,
    refreshToken,
    tokenType: tokenType ?? null,
    scope: scopes,
    obtainedAt,
    expiresAt,
  })

  const personService = new PersonService()
  try {
    await personService.addOrUpdateOrcidIdentifier(
      user.person.uid,
      orcidIdentifier,
    )
  } catch (error) {
    console.error('Error adding ORCID identifier / OAuth data', error)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=orcid_insert_failure`,
    )
  }

  return NextResponse.redirect(
    `${userRedirectionUrl}?success=orcid_authentication_success`,
  )
}
