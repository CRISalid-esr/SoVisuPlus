import { organizationPerimeterFromMemberships } from '@/types/organizationScopes'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationRelation } from '@/types/OrganizationRelation'
import { PersonMembership } from '@/types/PersonMembership'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const makeOrg = (
  uid: string,
  category: OrganizationCategory,
  genericType: OrganizationGenericType,
  parents: OrganizationRelation[] = [],
): OrganizationUnit => {
  const org = new OrganizationUnit(uid, null, [], [], category, genericType)
  org.parents = parents
  return org
}

const institution = () =>
  makeOrg(
    'local-UP1',
    OrganizationCategory.institution,
    OrganizationGenericType.institution,
  )

const subdivision = (uid = 'local-FAC1') =>
  makeOrg(
    uid,
    OrganizationCategory.institution_subdivision,
    OrganizationGenericType.institution_subdivision,
  )

describe('organizationPerimeterFromMemberships', () => {
  it('publishes direct research-unit and team memberships', () => {
    const perimeter = organizationPerimeterFromMemberships([
      new PersonMembership(
        makeOrg(
          'local-RU1',
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
        ),
      ),
      new PersonMembership(
        makeOrg(
          'local-T1',
          OrganizationCategory.team,
          OrganizationGenericType.team,
        ),
      ),
    ])

    expect(perimeter.ResearchUnit).toEqual(['local-RU1'])
    expect(perimeter.Team).toEqual(['local-T1'])
    expect(perimeter.Institution).toEqual([])
    expect(perimeter.InstitutionDivision).toEqual([])
  })

  it('expands research-unit memberships to their member_of institutions', () => {
    const perimeter = organizationPerimeterFromMemberships([
      new PersonMembership(
        makeOrg(
          'local-RU1',
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
          [
            new OrganizationRelation(
              institution(),
              'member_of',
              'associated_supervision',
            ),
          ],
        ),
      ),
    ])

    expect(perimeter.Institution).toEqual(['local-UP1'])
  })

  it('does not expand to institutions through part_of or from non-research units', () => {
    const perimeter = organizationPerimeterFromMemberships([
      // research unit only part_of the institution: no supervision
      new PersonMembership(
        makeOrg(
          'local-RU1',
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
          [new OrganizationRelation(institution(), 'part_of')],
        ),
      ),
      // support unit member_of the institution: not a research unit
      new PersonMembership(
        makeOrg(
          'local-SU1',
          OrganizationCategory.support_unit,
          OrganizationGenericType.unit,
          [new OrganizationRelation(institution(), 'member_of')],
        ),
      ),
    ])

    expect(perimeter.Institution).toEqual([])
  })

  it('publishes subdivisions from direct memberships and from attached organizations', () => {
    const perimeter = organizationPerimeterFromMemberships([
      // direct member of a subdivision
      new PersonMembership(subdivision('local-FAC1')),
      // member of a team member_of another subdivision
      new PersonMembership(
        makeOrg(
          'local-T1',
          OrganizationCategory.team,
          OrganizationGenericType.team,
          [new OrganizationRelation(subdivision('local-FAC2'), 'member_of')],
        ),
      ),
      // member of a research unit part_of a unit subdivision
      new PersonMembership(
        makeOrg(
          'local-RU1',
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
          [
            new OrganizationRelation(
              makeOrg(
                'local-AX1',
                OrganizationCategory.unit_subdivision,
                OrganizationGenericType.unit_subdivision,
              ),
              'part_of',
            ),
          ],
        ),
      ),
    ])

    expect(perimeter.InstitutionDivision.sort()).toEqual([
      'local-AX1',
      'local-FAC1',
      'local-FAC2',
    ])
  })

  it('returns empty perimeters without memberships', () => {
    expect(organizationPerimeterFromMemberships(undefined)).toEqual({
      ResearchUnit: [],
      Team: [],
      Institution: [],
      InstitutionDivision: [],
    })
  })

  it('deduplicates uids across memberships', () => {
    const membership = () =>
      new PersonMembership(
        makeOrg(
          'local-RU1',
          OrganizationCategory.research_unit,
          OrganizationGenericType.unit,
          [new OrganizationRelation(institution(), 'member_of')],
        ),
      )
    const perimeter = organizationPerimeterFromMemberships([
      membership(),
      membership(),
    ])
    expect(perimeter.ResearchUnit).toEqual(['local-RU1'])
    expect(perimeter.Institution).toEqual(['local-UP1'])
  })
})
