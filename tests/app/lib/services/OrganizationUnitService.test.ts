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

describe('OrganizationUnitService.getStructureMembers (integration)', () => {
  let service: OrganizationUnitService

  const baseQuery = {
    present: true,
    search: '',
    sortBy: 'name' as const,
    sortDesc: false,
    page: 1,
    pageSize: 10,
  }

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
        [institutionRelation('local-up1')],
      ),
    )
    const up1 = await prisma.organizationUnit.findUnique({
      where: { uid: 'local-up1' },
    })
    const ru1 = await prisma.organizationUnit.findUnique({
      where: { uid: 'local-ru1' },
    })

    // Élodie: current member of ru1, employed by up1, one recent OA+HAL doc
    const elodie = await prisma.person.create({
      data: {
        uid: 'p-elodie',
        slug: 'elodie-durand',
        firstName: 'Élodie',
        lastName: 'Durand',
        displayName: 'Élodie Durand',
        identifiers: { create: [{ type: 'idref', value: '123456789' }] },
      },
    })
    await prisma.membership.create({
      data: { personId: elodie.id, organizationUnitId: ru1!.id },
    })
    await prisma.employment.create({
      data: {
        personId: elodie.id,
        organizationUnitId: up1!.id,
        positionCode: 'MCF',
      },
    })

    // Bob: departed member of ru1 (endDate in the past), no employment
    const bob = await prisma.person.create({
      data: {
        uid: 'p-bob',
        slug: 'bob-martin',
        firstName: 'Bob',
        lastName: 'Martin',
        displayName: 'Bob Martin',
      },
    })
    await prisma.membership.create({
      data: {
        personId: bob.id,
        organizationUnitId: ru1!.id,
        startDate: new Date('2015-01-01'),
        endDate: new Date('2020-12-31'),
      },
    })

    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 6)
    await prisma.document.create({
      data: {
        uid: 'doc-elodie',
        publicationDateStart: recentDate,
        oaStatus: 'GREEN',
        contributions: { create: [{ personId: elodie.id, roles: ['aut'] }] },
        records: {
          create: [
            {
              uid: 'rec-m1',
              sourceIdentifier: 'rec-m1',
              platform: 'hal',
              titles: [],
            },
          ],
        },
      },
    })
  })

  it('lists direct memberships with KPIs, filtering the departed by default', async () => {
    const result = await service.getStructureMembers({
      ...baseQuery,
      uid: 'local-ru1',
    })
    expect(result!.total).toBe(1)
    const [member] = result!.members
    expect(member.uid).toBe('p-elodie')
    expect(member.publicationsCount).toBe(1)
    expect(member.oaRate).toBe(100)
    expect(member.halRate).toBe(100)
    expect(member.identifiers.map((i) => i.type)).toEqual(['idref'])
    // membership row carries no position: resolved from the employment
    expect(member.position).toBe('Maître de conférences')
  })

  it('includes departed members when present is off, sorted by name', async () => {
    const result = await service.getStructureMembers({
      ...baseQuery,
      uid: 'local-ru1',
      present: false,
    })
    expect(result!.total).toBe(2)
    expect(result!.members.map((m) => m.uid)).toEqual(['p-elodie', 'p-bob'])
    const bob = result!.members[1]
    expect(bob.startDate).toBe('2015-01-01')
    expect(bob.endDate).toBe('2020-12-31')
    expect(bob.publicationsCount).toBe(0)
    // no employment anywhere: no position
    expect(bob.position).toBeNull()
  })

  it('lists employments for institutions, not child-unit memberships', async () => {
    const result = await service.getStructureMembers({
      ...baseQuery,
      uid: 'local-up1',
      present: false,
    })
    expect(result!.members.map((m) => m.uid)).toEqual(['p-elodie'])
    // position comes straight from the employment row's corps code
    expect(result!.members[0].position).toBe('Maître de conférences')
  })

  it('searches names without case or diacritics sensitivity', async () => {
    const result = await service.getStructureMembers({
      ...baseQuery,
      uid: 'local-ru1',
      search: 'elodie',
    })
    expect(result!.members.map((m) => m.uid)).toEqual(['p-elodie'])
    const none = await service.getStructureMembers({
      ...baseQuery,
      uid: 'local-ru1',
      search: 'zzz',
    })
    expect(none!.total).toBe(0)
  })

  it('paginates after sorting', async () => {
    const result = await service.getStructureMembers({
      ...baseQuery,
      uid: 'local-ru1',
      present: false,
      pageSize: 10,
      page: 2,
    })
    expect(result!.total).toBe(2)
    expect(result!.members).toEqual([])
  })

  it('returns null for an unknown structure', async () => {
    const result = await service.getStructureMembers({
      ...baseQuery,
      uid: 'nope',
    })
    expect(result).toBeNull()
  })
})

describe('OrganizationUnitService structure visibility (integration)', () => {
  let service: OrganizationUnitService

  const partOf = (uid: string) =>
    new OrganizationRelation(
      makeOrg(
        uid,
        OrganizationCategory.institution,
        OrganizationGenericType.institution,
      ),
      'part_of',
      null,
    )

  const effectiveHidden = async (): Promise<string[]> =>
    (
      await prisma.organizationUnit.findMany({
        where: { hiddenEffective: true },
        select: { uid: true },
        orderBy: { uid: 'asc' },
      })
    ).map((unit) => unit.uid)

  beforeAll(() => {
    service = new OrganizationUnitService()
  })

  beforeEach(async () => {
    const organizationUnitDAO = new OrganizationUnitDAO()
    // local-up1 ─ local-div ─ local-team, plus local-ru1 supervised by both
    // local-up1 and a second institution local-up2.
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-up1',
        OrganizationCategory.institution,
        OrganizationGenericType.institution,
      ),
    )
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-up2',
        OrganizationCategory.institution,
        OrganizationGenericType.institution,
      ),
    )
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-div',
        OrganizationCategory.institution_subdivision,
        OrganizationGenericType.institution_subdivision,
        [partOf('local-up1')],
      ),
    )
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-team',
        OrganizationCategory.team,
        OrganizationGenericType.team,
        [partOf('local-div')],
      ),
    )
    await organizationUnitDAO.createOrUpdateOrganizationUnit(
      makeOrg(
        'local-ru1',
        OrganizationCategory.research_unit,
        OrganizationGenericType.unit,
        [institutionRelation('local-up1'), institutionRelation('local-up2')],
      ),
    )
  })

  it('cascades to the descendants reachable only through the hidden structure', async () => {
    const updated = await service.setHidden('local-up1', true)

    expect(updated).toEqual({
      uid: 'local-up1',
      hidden: true,
      hiddenEffective: true,
    })
    // local-ru1 survives: it is also supervised by local-up2.
    expect(await effectiveHidden()).toEqual([
      'local-div',
      'local-team',
      'local-up1',
    ])
  })

  it('restores the subtree when the structure is shown again', async () => {
    await service.setHidden('local-up1', true)
    await service.setHidden('local-up1', false)

    expect(await effectiveHidden()).toEqual([])
  })

  it('keeps a structure hidden in its own right when its ancestor comes back', async () => {
    await service.setHidden('local-div', true)
    await service.setHidden('local-up1', true)
    await service.setHidden('local-up1', false)

    expect(await effectiveHidden()).toEqual(['local-div', 'local-team'])
  })

  it('leaves the directory and its KPIs untouched by hidden structures', async () => {
    const person = await prisma.person.create({
      data: { uid: 'p-hidden', firstName: 'H', lastName: 'Idden' },
    })
    const team = await prisma.organizationUnit.findUnique({
      where: { uid: 'local-team' },
    })
    await prisma.membership.create({
      data: { personId: person.id, organizationUnitId: team!.id },
    })

    await service.setHidden('local-div', true)

    const visible = await service.getDirectory()
    expect(visible.map((entry) => entry.uid).sort()).toEqual([
      'local-ru1',
      'local-up1',
      'local-up2',
    ])
    // the hidden subdivision's members no longer count for its institution
    expect(
      visible.find((entry) => entry.uid === 'local-up1')!.membersCount,
    ).toBe(0)

    const withHidden = await service.getDirectory({ includeHidden: true })
    const div = withHidden.find((entry) => entry.uid === 'local-div')!
    expect(div.hidden).toBe(true)
    expect(div.hiddenEffective).toBe(true)
    const team1 = withHidden.find((entry) => entry.uid === 'local-team')!
    expect(team1.hidden).toBe(false)
    expect(team1.hiddenEffective).toBe(true)
    expect(team1.membersCount).toBe(1)
  })

  it('excludes hidden structures from the perspective search', async () => {
    await service.setHidden('local-up1', true)

    const { organizations, total } = await service.getOrganizationUnits({
      searchTerm: '',
      group: 'institution',
      pageNumber: 1,
      itemsPerPage: 10,
    })
    expect(total).toBe(1)
    expect(organizations.map((org) => org.uid)).toEqual(['local-up2'])
  })

  it('returns null for an unknown structure', async () => {
    expect(await service.setHidden('nope', true)).toBeNull()
  })
})
