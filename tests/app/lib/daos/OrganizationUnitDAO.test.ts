import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationRelation } from '@/types/OrganizationRelation'
import { Literal } from '@/types/Literal'
import prisma from '@/lib/daos/prisma'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const makeUnit = ({
  uid,
  acronym = null,
  names = [Literal.fromObject({ value: `Unit ${uid}`, language: 'en' })],
  descriptions = [],
  category = OrganizationCategory.research_unit,
  genericType = OrganizationGenericType.unit,
  nationalType = null,
  identifiers = [],
  external = false,
  localTypes = [],
}: {
  uid: string
  acronym?: string | null
  names?: Literal[]
  descriptions?: Literal[]
  category?: OrganizationCategory
  genericType?: OrganizationGenericType
  nationalType?: string | null
  identifiers?: { type: string; value: string }[]
  external?: boolean
  localTypes?: Literal[]
}): OrganizationUnit =>
  new OrganizationUnit(
    uid,
    acronym,
    names,
    descriptions,
    category,
    genericType,
    nationalType,
    identifiers as OrganizationUnit['identifiers'],
    null,
    external,
    localTypes,
  )

describe('OrganizationUnitDAO Integration Tests', () => {
  let organizationUnitDAO: OrganizationUnitDAO

  beforeAll(() => {
    organizationUnitDAO = new OrganizationUnitDAO()
  })

  describe('createOrUpdateOrganizationUnit', () => {
    it('creates a unit with labels, descriptions and identifiers', async () => {
      const unit = makeUnit({
        uid: 'local-RS001',
        acronym: 'RS',
        names: [
          Literal.fromObject({ value: 'Research center', language: 'en' }),
          Literal.fromObject({ value: 'Centre de recherche', language: 'fr' }),
        ],
        descriptions: [
          Literal.fromObject({ value: 'A research center', language: 'en' }),
        ],
        nationalType: 'UMR',
        identifiers: [
          { type: 'local', value: 'RS001' },
          { type: 'ror', value: 'ROR-1' },
        ],
        localTypes: [Literal.fromObject({ value: 'Centre', language: 'fr' })],
      })

      await organizationUnitDAO.createOrUpdateOrganizationUnit(unit)

      const dbUnit = await prisma.organizationUnit.findUnique({
        where: { uid: 'local-RS001' },
        include: { labels: true, descriptions: true, identifiers: true },
      })
      expect(dbUnit).not.toBeNull()
      expect(dbUnit!.genericType).toBe('unit')
      expect(dbUnit!.category).toBe('research_unit')
      expect(dbUnit!.nationalType).toBe('UMR')
      expect(dbUnit!.acronym).toBe('RS')
      expect(dbUnit!.slug).toBe('org:rs')
      expect(dbUnit!.labels).toHaveLength(2)
      expect(dbUnit!.descriptions).toHaveLength(1)
      expect(dbUnit!.identifiers).toHaveLength(2)
      expect(dbUnit!.localTypes).toEqual([{ value: 'Centre', language: 'fr' }])
    })

    it('authoritatively replaces labels, descriptions and identifiers on update', async () => {
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-RS002',
          names: [
            Literal.fromObject({ value: 'Old name EN', language: 'en' }),
            Literal.fromObject({ value: 'Ancien nom FR', language: 'fr' }),
          ],
          descriptions: [
            Literal.fromObject({ value: 'Old description', language: 'en' }),
          ],
          identifiers: [
            { type: 'local', value: 'RS002' },
            { type: 'ror', value: 'ROR-2' },
          ],
        }),
      )

      // Update: fr label gone, en renamed; description gone; ror gone, idref added
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-RS002',
          names: [Literal.fromObject({ value: 'New name EN', language: 'en' })],
          descriptions: [],
          identifiers: [
            { type: 'local', value: 'RS002' },
            { type: 'idref', value: 'IDREF-2' },
          ],
        }),
      )

      const dbUnit = await prisma.organizationUnit.findUnique({
        where: { uid: 'local-RS002' },
        include: { labels: true, descriptions: true, identifiers: true },
      })
      expect(dbUnit!.labels).toHaveLength(1)
      expect(dbUnit!.labels[0].value).toBe('New name EN')
      expect(dbUnit!.descriptions).toHaveLength(0)
      expect(
        dbUnit!.identifiers.map((i) => `${i.type}:${i.value}`).sort(),
      ).toEqual(['idref:IDREF-2', 'local:RS002'])
    })

    it('creates relationships to existing parents with kind, position and dates', async () => {
      const dbParent = await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-UP1',
          category: OrganizationCategory.institution,
          genericType: OrganizationGenericType.institution,
        }),
      )

      const child = makeUnit({ uid: 'local-RS003' })
      child.parents = [
        new OrganizationRelation(
          makeUnit({
            uid: 'local-UP1',
            category: OrganizationCategory.institution,
            genericType: OrganizationGenericType.institution,
          }),
          'member_of',
          'main_supervision',
          '2000-01-01',
          null,
        ),
      ]
      const dbChild =
        await organizationUnitDAO.createOrUpdateOrganizationUnit(child)

      const relationships = await prisma.organizationRelationship.findMany({
        where: { childId: dbChild.id },
      })
      expect(relationships).toHaveLength(1)
      expect(relationships[0].parentId).toBe(dbParent.id)
      expect(relationships[0].kind).toBe('member_of')
      expect(relationships[0].position).toBe('main_supervision')
      expect(relationships[0].startDate).toEqual(new Date('2000-01-01'))
      expect(relationships[0].endDate).toBeNull()
    })

    it('shallow-creates a missing parent without blocking the child', async () => {
      const child = makeUnit({ uid: 'local-RS004' })
      child.parents = [
        new OrganizationRelation(
          makeUnit({
            uid: 'uai-0000000A',
            category: OrganizationCategory.institution,
            genericType: OrganizationGenericType.institution,
            names: [],
            external: true,
            identifiers: [{ type: 'uai', value: '0000000A' }],
          }),
          'member_of',
        ),
      ]
      const dbChild =
        await organizationUnitDAO.createOrUpdateOrganizationUnit(child)

      const dbParent = await prisma.organizationUnit.findUnique({
        where: { uid: 'uai-0000000A' },
        include: { identifiers: true },
      })
      expect(dbParent).not.toBeNull()
      expect(dbParent!.external).toBe(true)
      expect(dbParent!.category).toBe('institution')
      expect(dbParent!.identifiers).toHaveLength(1)

      const relationships = await prisma.organizationRelationship.findMany({
        where: { childId: dbChild.id },
      })
      expect(relationships).toHaveLength(1)
      expect(relationships[0].parentId).toBe(dbParent!.id)
    })

    it('does not overwrite an existing parent during child sync', async () => {
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-UP2',
          acronym: 'UP2',
          category: OrganizationCategory.institution,
          genericType: OrganizationGenericType.institution,
          nationalType: 'UNIV',
        }),
      )

      const child = makeUnit({ uid: 'local-RS005' })
      child.parents = [
        new OrganizationRelation(
          makeUnit({
            uid: 'local-UP2',
            acronym: 'STALE',
            category: OrganizationCategory.institution,
            genericType: OrganizationGenericType.institution,
            nationalType: null,
          }),
          'member_of',
        ),
      ]
      await organizationUnitDAO.createOrUpdateOrganizationUnit(child)

      const dbParent = await prisma.organizationUnit.findUnique({
        where: { uid: 'local-UP2' },
      })
      expect(dbParent!.acronym).toBe('UP2')
      expect(dbParent!.nationalType).toBe('UNIV')
    })

    it('authoritatively replaces the child relationships, leaving parent-side rows untouched', async () => {
      const dbGrandParent =
        await organizationUnitDAO.createOrUpdateOrganizationUnit(
          makeUnit({
            uid: 'local-EPE',
            category: OrganizationCategory.institution,
            genericType: OrganizationGenericType.institution,
          }),
        )
      const middle = makeUnit({
        uid: 'local-UP3',
        category: OrganizationCategory.institution,
        genericType: OrganizationGenericType.institution,
      })
      middle.parents = [
        new OrganizationRelation(
          makeUnit({
            uid: 'local-EPE',
            category: OrganizationCategory.institution,
            genericType: OrganizationGenericType.institution,
          }),
          'part_of',
        ),
      ]
      const dbMiddle =
        await organizationUnitDAO.createOrUpdateOrganizationUnit(middle)

      // A child of the middle institution
      const child = makeUnit({ uid: 'local-RS006' })
      child.parents = [
        new OrganizationRelation(
          makeUnit({
            uid: 'local-UP3',
            category: OrganizationCategory.institution,
            genericType: OrganizationGenericType.institution,
          }),
          'member_of',
          'main_supervision',
        ),
      ]
      await organizationUnitDAO.createOrUpdateOrganizationUnit(child)

      // Re-sync the middle institution without any parents: its own
      // relationships are replaced (removed)…
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-UP3',
          category: OrganizationCategory.institution,
          genericType: OrganizationGenericType.institution,
        }),
      )

      const middleParents = await prisma.organizationRelationship.findMany({
        where: { childId: dbMiddle.id },
      })
      expect(middleParents).toHaveLength(0)
      expect(
        await prisma.organizationRelationship.findMany({
          where: { parentId: dbGrandParent.id },
        }),
      ).toHaveLength(0)

      // …but rows where it is the parent survive
      const middleChildren = await prisma.organizationRelationship.findMany({
        where: { parentId: dbMiddle.id },
      })
      expect(middleChildren).toHaveLength(1)
    })
  })

  describe('getOrganizationUnits search', () => {
    beforeEach(async () => {
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-RU1',
          names: [Literal.fromObject({ value: 'Alpha lab', language: 'en' })],
        }),
      )
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-SU1',
          category: OrganizationCategory.support_unit,
          names: [
            Literal.fromObject({ value: 'Alpha support', language: 'en' }),
          ],
        }),
      )
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-INST1',
          category: OrganizationCategory.institution,
          genericType: OrganizationGenericType.institution,
          names: [
            Literal.fromObject({ value: 'Alpha university', language: 'en' }),
          ],
        }),
      )
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'uai-EXT1',
          category: OrganizationCategory.institution,
          genericType: OrganizationGenericType.institution,
          external: true,
          names: [
            Literal.fromObject({
              value: 'Alpha external institution',
              language: 'en',
            }),
          ],
        }),
      )
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-TEAM1',
          category: OrganizationCategory.team,
          genericType: OrganizationGenericType.team,
          names: [Literal.fromObject({ value: 'Alpha team', language: 'en' })],
        }),
      )
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({
          uid: 'local-FAC1',
          category: OrganizationCategory.institution_subdivision,
          genericType: OrganizationGenericType.institution_subdivision,
          names: [
            Literal.fromObject({ value: 'Alpha faculty', language: 'en' }),
          ],
        }),
      )
    })

    it('filters by group and always excludes external structures', async () => {
      const researchUnits = await organizationUnitDAO.getOrganizationUnits(
        'alpha',
        'research_unit',
        1,
        10,
      )
      expect(researchUnits.map((o) => o.uid)).toEqual(['local-RU1'])

      const institutions = await organizationUnitDAO.getOrganizationUnits(
        'alpha',
        'institution',
        1,
        10,
      )
      expect(institutions.map((o) => o.uid)).toEqual(['local-INST1'])

      const teams = await organizationUnitDAO.getOrganizationUnits(
        'alpha',
        'team',
        1,
        10,
      )
      expect(teams.map((o) => o.uid)).toEqual(['local-TEAM1'])

      const otherStructures = await organizationUnitDAO.getOrganizationUnits(
        'alpha',
        'other_structure',
        1,
        10,
      )
      expect(otherStructures.map((o) => o.uid)).toEqual(['local-FAC1'])
    })

    it('support units are unreachable through any group', async () => {
      for (const group of [
        'institution',
        'research_unit',
        'other_structure',
        'team',
      ] as const) {
        const results = await organizationUnitDAO.getOrganizationUnits(
          'support',
          group,
          1,
          10,
        )
        expect(results).toHaveLength(0)
      }
    })

    it('counts organization units per group', async () => {
      expect(
        await organizationUnitDAO.countOrganizationUnits(
          'alpha',
          'research_unit',
        ),
      ).toBe(1)
      expect(
        await organizationUnitDAO.countOrganizationUnits(
          'alpha',
          'institution',
        ),
      ).toBe(1)
    })
  })

  describe('slug generation', () => {
    it('suffixes colliding slugs with the org: prefix', async () => {
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({ uid: 'local-A1', acronym: 'SAME' }),
      )
      await organizationUnitDAO.createOrUpdateOrganizationUnit(
        makeUnit({ uid: 'local-A2', acronym: 'SAME' }),
      )

      const first = await prisma.organizationUnit.findUnique({
        where: { uid: 'local-A1' },
      })
      const second = await prisma.organizationUnit.findUnique({
        where: { uid: 'local-A2' },
      })
      expect(first!.slug).toBe('org:same')
      expect(second!.slug).toBe('org:same-1')
    })
  })
})
