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

const isLoginOrLogout = (client: string): client is 'login' | 'logout' =>
  client === 'login' || client === 'logout'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ client: string }> },
) {
  const sovisuplusHost = process.env.NEXT_PUBLIC_BASE_URL
  if (!sovisuplusHost) {
    return new NextResponse('NEXT_PUBLIC_BASE_URL is not set', { status: 500 })
  }

  // Notice: hardcode fr for now
  const userRedirectionUrl = `${sovisuplusHost}/fr/account`

  const { client } = await context.params
  if (!isLoginOrLogout(client))
    return new Response('Not found', { status: 404 })

  // If we implement logout later
  if (client === 'logout') {
    return NextResponse.redirect(
      `${userRedirectionUrl}?success=hal-logout-success`,
    )
  }

  const ticket = req.nextUrl.searchParams.get('ticket')
  if (!ticket) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-authentication-failure-no-ticket`,
    )
  }

  // Require a valid NextAuth session
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string; id?: string }
  }
  if (!session?.user?.id || !session?.user?.username) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-authentication-failure-no-session`,
    )
  }

  // Find user/person in DB
  const userService = new UserService()
  const user = await userService.getUserByPersonIdentifier(
    new PersonIdentifier(PersonIdentifierType.LOCAL, session.user.username),
  )
  if (!user?.person) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-authentication-failure-user-not-found`,
    )
  }

  // Validate CAS ticket (CAS 2.0)
  const casBase = process.env.NEXT_PUBLIC_CAS_URL // e.g. https://cas.ccsd.cnrs.fr/cas
  if (!casBase) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-authentication-failure-misconfig`,
    )
  }

  // avoid double slashes
  const service = `${sovisuplusHost.replace(/\/$/, '')}/api/cas/login`

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
      `${userRedirectionUrl}?error=hal-authentication-failure`,
    )
  }

  console.debug('[CAS] Ticket validated, attributes:', parsed.attributes)

  const email = parsed.attributes.email
  const halLogin = parsed.attributes.userName

  if (!email) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-auth-missing-data`,
    )
  }
  if (!halLogin) {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-auth-missing-data`,
    )
  }

  // Resolve idHal from AureHAL
  const aurehal = new AureHalAPIClient()
  let idHalDoc
  try {
    idHalDoc = await aurehal.findAuthorByEmail(email)
  } catch (e) {
    console.error('[AureHAL] lookup failed', e)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-unavailable-data`,
    )
  }

  console.debug('[AureHAL] resolved idHalDoc', idHalDoc)

  if (!idHalDoc?.idHal_s && typeof idHalDoc?.idHal_i !== 'number') {
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-missing-identifiers`,
    )
  }

  const personService = new PersonService()
  try {
    await personService.addOrUpdateIdentifier(
      user.person.uid,
      PersonIdentifierType.HAL_LOGIN,
      halLogin,
    )

    if (idHalDoc.idHal_s) {
      await personService.addOrUpdateIdentifier(
        user.person.uid,
        PersonIdentifierType.ID_HAL_S,
        idHalDoc.idHal_s,
      )
    } else {
      await personService.addOrUpdateIdentifier(
        user.person.uid,
        PersonIdentifierType.ID_HAL_I,
        String(idHalDoc.idHal_i),
      )
    }
  } catch (e) {
    console.error('[HAL] DB write failed', e)
    return NextResponse.redirect(
      `${userRedirectionUrl}?error=hal-identifier-insert-failure`,
    )
  }

  return NextResponse.redirect(
    `${userRedirectionUrl}?success=hal-authentication-success`,
  )
}
