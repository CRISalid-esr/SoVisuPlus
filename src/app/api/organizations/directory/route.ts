import { NextRequest, NextResponse } from 'next/server'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { resolveIncludeHidden } from '@/app/auth/structureVisibility'
import { requireSession } from '@/app/auth/requireSession'

const organizationUnitService = new OrganizationUnitService()

export const GET = async (req: NextRequest) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  try {
    // Unauthorised callers simply get the visible directory — asking for
    // hidden structures without the permission is ignored, not rejected.
    const includeHidden = resolveIncludeHidden(
      req.nextUrl.searchParams,
      session,
    )
    const structures = await organizationUnitService.getDirectory({
      includeHidden,
    })
    return NextResponse.json({ structures })
  } catch (error) {
    console.error('Error building the organizations directory:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
