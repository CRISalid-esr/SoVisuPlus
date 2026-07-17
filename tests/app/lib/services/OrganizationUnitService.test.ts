import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationRelation } from '@/types/OrganizationRelation'
import { Literal } from '@/types/Literal'
import prisma from '@/lib/daos/prisma'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const makeOrg = (
  uid: string,
  category: OrganizationCategory,
  genericType: OrganizationGenericType,
  parents: OrganizationRelation[] = [],
) => {
  const org = new OrganizationUnit(
    uid,
    uid.toUpperCase(),
    [Literal.fromObject({ value: `Name of ${uid}`, language: 'en' })],
    [],
    category,
    genericType,
  )
  org.parents = parents
  return org
}

const institutionRelation = (uid: string, position: string | null = null) =>
  new OrganizationRelation(
    makeOrg(
      uid,
      OrganizationCategory.institution,
      OrganizationGenericType.institution,
    ),
    'member_of',
    position,
  )

describe('OrganizationUnitService.getDirectory (integration)', () => {
  let service: OrganizationUnitService

  beforeAll(() => {
    service = new OrganizationUnitService()
  })

  beforeEach(async () => {
    const organizationUnitDAO = new OrganizationUnitDAO()
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-up1',
        OrganizationCategory.institution,
        OrganizationGenericType.institution,
      ),
    )
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-ru1',
        OrganizationCategory.research_unit,
        OrganizationGenericType.unit,
        [institutionRelation('local-up1', 'main_supervision')],
      ),
    )

    // a member of the research unit with one recent OA + HAL document
    // and one old document (outside the 24-month window)
    const ru1 = await prisma.organizationUnit.findUnique({
      where: { uid: 'local-ru1' },
    })
    const person = await prisma.person.create({
      data: { uid: 'p-1', firstName: 'P', lastName: 'One' },
    })
    await prisma.membership.create({
      data: { personId: person.id, organizationUnitId: ru1!.id },
    })

    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 6)
    const oldDate = new Date()
    oldDate.setMonth(oldDate.getMonth() - 48)

    await prisma.document.create({
      data: {
        uid: 'doc-recent',
        publicationDateStart: recentDate,
        oaStatus: 'GREEN',
        contributions: { create: [{ personId: person.id, roles: ['aut'] }] },
        records: {
          create: [
            {
              uid: 'rec-1',
              sourceIdentifier: 'rec-1',
              platform: 'hal',
              titles: [],
            },
          ],
        },
      },
    })
    await prisma.document.create({
      data: {
        uid: 'doc-old',
        publicationDateStart: oldDate,
        oaStatus: 'CLOSED',
        contributions: { create: [{ personId: person.id, roles: ['aut'] }] },
      },
    })
  })

  it('computes perimeter KPIs over the last 24 months', async () => {
    const directory = await service.getDirectory()
    const byUid = new Map(directory.map((entry) => [entry.uid, entry]))

    const ru1 = byUid.get('local-ru1')!
    expect(ru1.membersCount).toBe(1)
    expect(ru1.publicationsCount).toBe(1) // the old document is excluded
    expect(ru1.oaRate).toBe(100)
    expect(ru1.halRate).toBe(100)
    expect(ru1.parents).toEqual([
      {
        parentUid: 'local-up1',
        kind: 'member_of',
        position: 'main_supervision',
      },
    ])

    // the institution inherits the supervised research unit's perimeter
    const up1 = byUid.get('local-up1')!
    expect(up1.membersCount).toBe(1)
    expect(up1.publicationsCount).toBe(1)
    expect(up1.oaRate).toBe(100)
  })
})
