import { NextRequest, NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'
import { requireSession } from '@/app/auth/requireSession'
import {
  abilityFromAuthzContext,
  hasWiderThanSelfPersonScope,
} from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { canSeeProfileValidation } from '@/lib/identifiers/identifierCapabilities'

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  const { slug } = await context.params
  const personService = new PersonService()

  try {
    const person = await personService.fetchPersonBySlug(slug)
    if (!person) {
      return NextResponse.json(
        { error: `Person with slug ${slug} not found.` },
        { status: 404 },
      )
    }

    // The profile validation status is only disclosed to wide-scoped editors.
    if (
      person.validated &&
      !canSeeProfileValidation({
        canManage: abilityFromAuthzContext(session.user.authz).can(
          PermissionAction.update,
          person,
          'identifiers',
        ),
        isWide: hasWiderThanSelfPersonScope(
          session.user.authz,
          'update',
          'Person',
          'identifiers',
        ),
      })
    ) {
      person.validated = false
    }

    return NextResponse.json(person)
  } catch (error) {
    console.error(`Error fetching person with slug ${slug}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch person.' },
      { status: 500 },
    )
  }
}
