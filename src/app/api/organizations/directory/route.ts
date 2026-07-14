import { NextResponse } from 'next/server'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'

const organizationUnitService = new OrganizationUnitService()

export const GET = async () => {
  try {
    const structures = await organizationUnitService.getDirectory()
    return NextResponse.json({ structures })
  } catch (error) {
    console.error('Error building the organizations directory:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
