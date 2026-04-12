import { NextRequest, NextResponse } from 'next/server'
import * as process from 'node:process'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'

import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'
import { PersonService } from '@/lib/services/PersonService'
import { UserService } from '@/lib/services/UserService'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { parseCasTicketValidationResult } from '@/app/utils/parseCasTicketValidationResult'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

const isLoginOrLogout = (action: string): action is 'login' | 'logout' =>
  action === 'login' || action === 'logout'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const sovisuplusHost = process.env.NEXT_PUBLIC_BASE_URL
  if (!sovisuplusHost) {
    return new NextResponse('NEXT_PUBLIC_BASE_URL is not set', { status: 500 })
  }

  const lang =
    req.nextUrl.searchParams.get('lang') ??
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')[0]
  const userRedirectionUrl = `${sovisuplusHost}/${lang}/account`

  const { action } = await context.params
  if (!isLoginOrLogout(action))
    return new Response('Not found', { status: 404 })

  // If we implement logout later
  if (action === 'logout') {
    return NextResponse.redirect(
      `${userRedirectionUrl}?success=hal-logout-success`,
    )
  }

  const ticket = req.nextUrl.searchParams.get('ticket')
  if (!ticket) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_authentication_failure_no_ticket`,
    )
  }

  // Require a valid NextAuth session
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string; id?: string }
  }
  if (!session?.user?.id || !session?.user?.username) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_authentication_failure_no_session`,
    )
  }

  // Find user/person in DB
  const userService = new UserService()
  const user = await userService.getUserByPersonIdentifier(
    new PersonIdentifier(PersonIdentifierType.local, session.user.username),
  )
  if (!user?.person) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_authentication_failure_user_not_found`,
    )
  }

  const ability = abilityFromAuthzContext(session.user.authz)
  if (!ability.can(PermissionAction.update, user.person, 'identifiers')) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_authentication_failure`,
    )
  }

  // Validate CAS ticket (CAS 2.0)
  const casBase = process.env.NEXT_PUBLIC_CAS_URL // e.g. https://cas.ccsd.cnrs.fr/cas
  if (!casBase) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_authentication_failure_misconfig`,
    )
  }

  // avoid double slashes
  const service = `${sovisuplusHost.replace(/\/$/, '')}/api/cas/login?lang=${lang}`

  const validateUrl =
    `${casBase.replace(/\/$/, '')}/serviceValidate` +
    `?service=${encodeURIComponent(service)}` +
    `&ticket=${encodeURIComponent(ticket)}`

  const validationRes = await fetch(validateUrl, {
    headers: { accept: 'text/xml' },
    // avoid caching for fresh validation
    cache: 'no-store',
  })

  const xml = await validationRes.text()
  const parsed = parseCasTicketValidationResult(xml)

  if (!validationRes.ok || !parsed.success) {
    console.error('[CAS] Ticket validation failed', {
      httpStatus: validationRes.status,
      failureCode: parsed.success ? undefined : parsed.failureCode,
      failureMessage: parsed.success ? undefined : parsed.failureMessage,
      validateUrl,
    })
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_authentication_failure`,
    )
  }

  console.debug('[CAS] Ticket validated, attributes:', parsed.attributes)

  const uid = parsed.attributes.uid
  const halLogin = parsed.attributes.userName

  if (!uid) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_auth_missing_data`,
    )
  }
  if (!halLogin) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_auth_missing_data`,
    )
  }

  // Resolve idHal from AureHAL using uid
  const aurehal = new AureHalAPIClient()
  let idHalDoc
  try {
    idHalDoc = await aurehal.findAuthorByUid(uid)
  } catch (e) {
    console.error('[AureHAL] lookup failed', e)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_unavailable_data`,
    )
  }

  console.debug('[AureHAL] resolved idHalDoc', idHalDoc)

  if (!idHalDoc?.idHal_s && typeof idHalDoc?.idHal_i !== 'number') {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_missing_identifiers`,
    )
  }

  const personService = new PersonService()
  try {
    await personService.addOrUpdateIdentifier(
      user.person.uid,
      PersonIdentifierType.hal_login,
      halLogin,
    )

    if (idHalDoc.idHal_s) {
      await personService.addOrUpdateIdentifier(
        user.person.uid,
        PersonIdentifierType.idhals,
        idHalDoc.idHal_s,
      )
    } else {
      await personService.addOrUpdateIdentifier(
        user.person.uid,
        PersonIdentifierType.idhali,
        String(idHalDoc.idHal_i),
      )
    }
  } catch (e) {
    console.error('[HAL] DB write failed', e)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal_identifier_insert_failure`,
    )
  }

  return NextResponse.redirect(
    `${userRedirectionUrl}?success=hal_authentication_success`,
  )
}
