import { NextRequest, NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'
import { requireSession } from '@/app/auth/requireSession'

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const { error: authError } = await requireSession()
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

    return NextResponse.json(person)
  } catch (error) {
    console.error(`Error fetching person with slug ${slug}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch person.' },
      { status: 500 },
    )
  }
}
