import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'
import { IdentifierConflictError, PersonDAO } from '@/lib/daos/PersonDAO'
import {
  abilityFromAuthzContext,
  hasWiderThanSelfPersonScope,
} from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import {
  computeIdentifierCapabilities,
  identifierSupportsAuth,
} from '@/lib/identifiers/identifierCapabilities'

// Identifier types that can be added/removed through this route and their
// validation rules. ORCID is validated after ORCIDIdentifier.normalize().
const ALLOWED_TYPES: Partial<Record<PersonIdentifierType, RegExp>> = {
  [PersonIdentifierType.idref]: /^\d{8}[\dX]$/i,
  [PersonIdentifierType.orcid]: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i,
  [PersonIdentifierType.idhals]: /^[a-z0-9-]+$/i,
  [PersonIdentifierType.idhali]: /^\d+$/,
}

// idHAL is a single logical identity: adding one variant is rejected while the
// other is present (remove-before-add), so a person never holds both.
const IDHAL_TYPES: PersonIdentifierType[] = [
  PersonIdentifierType.idhals,
  PersonIdentifierType.idhali,
]

type RouteContext = { params: Promise<{ uid: string; type: string }> }

const resolveContext = async (
  context: RouteContext,
  session: Session | null,
): Promise<
  | { error: NextResponse }
  | { uid: string; identifierType: PersonIdentifierType }
> => {
  if (!session?.user?.authz) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { uid, type } = await context.params

  const identifierType = PersonIdentifier.typeFromString(
    type,
  ) as PersonIdentifierType | null
  if (!identifierType || !(identifierType in ALLOWED_TYPES)) {
    return {
      error: NextResponse.json(
        {
          error: `Identifier type '${type}' cannot be updated through this endpoint`,
        },
        { status: 400 },
      ),
    }
  }

  return { uid, identifierType }
}

// Normalise the value to how it is stored, before validation. IdRef and ORCID
// carry an uppercase 'X' check digit; idHAL (idhals) is case-sensitive and kept
// as entered.
const normaliseValue = (type: PersonIdentifierType, raw: string): string => {
  switch (type) {
    case PersonIdentifierType.orcid:
      return ORCIDIdentifier.normalize(raw).toUpperCase()
    case PersonIdentifierType.idref:
      return raw.toUpperCase()
    default:
      return raw
  }
}

export const PUT = async (request: Request, context: RouteContext) => {
  const session = (await getServerSession(authOptions)) as Session
  const resolved = await resolveContext(context, session)
  if ('error' in resolved) return resolved.error
  const { uid, identifierType } = resolved

  let body: { value?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const value = normaliseValue(identifierType, body.value?.trim() ?? '')
  const validationRegex = ALLOWED_TYPES[identifierType]!
  if (!value || !validationRegex.test(value)) {
    return NextResponse.json(
      { error: `Invalid format for identifier type '${identifierType}'` },
      { status: 400 },
    )
  }

  const personDAO = new PersonDAO()
  const person = await personDAO.fetchPersonByUid(uid)
  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 })
  }

  // Adding without authenticating is a wide-scoped-only capability (self-scoped
  // editors can only remove / authenticate — never add non-authenticated).
  const ability = abilityFromAuthzContext(session.user.authz)
  if (!ability.can(PermissionAction.update, person, 'identifiers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (
    !hasWiderThanSelfPersonScope(
      session.user.authz,
      'update',
      'Person',
      'identifiers',
    )
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Remove-before-add: an existing identifier must be removed first. idHAL
  // variants share one slot.
  const conflictTypes = IDHAL_TYPES.includes(identifierType)
    ? IDHAL_TYPES
    : [identifierType]
  const alreadyPresent = conflictTypes.some((t) => person.hasIdentifier(t))
  if (alreadyPresent) {
    return NextResponse.json(
      { error: 'identifier_already_exists' },
      { status: 409 },
    )
  }

  try {
    const personService = new PersonService()
    await personService.addIdentifier(
      uid,
      new PersonIdentifier(identifierType, value),
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof IdentifierConflictError) {
      return NextResponse.json(
        { error: 'identifier_already_exists' },
        { status: 409 },
      )
    }
    console.error(`❌ Error adding ${identifierType} identifier:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export const DELETE = async (_request: Request, context: RouteContext) => {
  const session = (await getServerSession(authOptions)) as Session
  const resolved = await resolveContext(context, session)
  if ('error' in resolved) return resolved.error
  const { uid, identifierType } = resolved

  const personDAO = new PersonDAO()
  const person = await personDAO.fetchPersonByUid(uid)
  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 })
  }

  const ability = abilityFromAuthzContext(session.user.authz)
  if (!ability.can(PermissionAction.update, person, 'identifiers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // An authenticated identifier can only be removed on the owner's own account.
  // A non-authenticated one can also be removed by a wide-scoped editor.
  const { canRemove } = computeIdentifierCapabilities({
    canManage: true, // already checked above
    isOwn: session.user.authz?.personUid === person.uid,
    isWide: hasWiderThanSelfPersonScope(
      session.user.authz,
      'update',
      'Person',
      'identifiers',
    ),
    isAuthenticated: person.isIdentifierAuthenticated(identifierType),
    supportsAuth: identifierSupportsAuth(identifierType),
  })
  if (!canRemove) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const personService = new PersonService()
    await personService.removeIdentifier(uid, identifierType)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`❌ Error removing ${identifierType} identifier:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
