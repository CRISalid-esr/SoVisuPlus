import { OrganizationCategory } from '@prisma/client'
import { StructureRow } from './directoryRows'
import {
  ancestorsOf,
  buildTreeItems,
  clampPanelWidth,
  decorateForest,
  filterForest,
  indexForest,
  normalizeForSearch,
  PANEL_WIDTH,
  treeLabel,
  visibleChildren,
} from './treeExplorerUtils'
import {
  groupNodeId,
  groupOf,
  isGroupNodeId,
  StructureGroupKey,
} from './structureGroups'

const makeRow = (
  uid: string,
  overrides: Partial<StructureRow> = {},
): StructureRow => ({
  uid,
  slug: `org:${uid}`,
  acronym: uid.toUpperCase(),
  name: `Name of ${uid}`,
  category: OrganizationCategory.research_unit,
  nationalType: null,
  external: false,
  institutionNames: [],
  membersCount: 0,
  publicationsCount: 0,
  oaRate: 0,
  halRate: 0,
  parents: [],
  originalUid: uid.includes('@@') ? uid.split('@@')[0] : uid,
  ...overrides,
})

// Two roots sharing the duplicated structure "shared" (co-tutelle shape):
// r1 ─ a ─ shared@@r1 ─ leaf@@r1
// r2 ─ shared@@r2 ─ leaf@@r2
const forest = (): StructureRow[] => [
  makeRow('r1', {
    subRows: [
      makeRow('a', {
        subRows: [
          makeRow('shared@@r1', {
            subRows: [makeRow('leaf@@r1')],
          }),
        ],
      }),
    ],
  }),
  makeRow('r2', {
    subRows: [
      makeRow('shared@@r2', {
        subRows: [makeRow('leaf@@r2')],
      }),
    ],
  }),
]

describe('indexForest', () => {
  it('maps node ids to rows and parents', () => {
    const index = indexForest(forest())
    expect(index.rowByNodeId.get('shared@@r1')?.originalUid).toBe('shared')
    expect(index.parentByNodeId.get('shared@@r1')).toBe('a')
    expect(index.parentByNodeId.get('r1')).toBeNull()
  })

  it('resolves a duplicated uid to its first occurrence in tree order', () => {
    const index = indexForest(forest())
    expect(index.firstNodeIdByUid.get('shared')).toBe('shared@@r1')
    expect(index.firstNodeIdByUid.get('leaf')).toBe('leaf@@r1')
    expect(index.firstNodeIdByUid.get('r2')).toBe('r2')
  })

  it('lists the expandable node ids', () => {
    const index = indexForest(forest())
    expect(index.expandableNodeIds).toEqual([
      'r1',
      'a',
      'shared@@r1',
      'r2',
      'shared@@r2',
    ])
  })
})

describe('ancestorsOf', () => {
  it('walks the parent chain up to the root', () => {
    const index = indexForest(forest())
    expect(ancestorsOf('leaf@@r1', index.parentByNodeId)).toEqual([
      'shared@@r1',
      'a',
      'r1',
    ])
    expect(ancestorsOf('r1', index.parentByNodeId)).toEqual([])
  })
})

describe('normalizeForSearch', () => {
  it('is case- and diacritics-insensitive', () => {
    expect(normalizeForSearch('Économie Générale')).toBe('economie generale')
    expect(normalizeForSearch('UMR 8103 – ISJPS')).toBe('umr 8103 – isjps')
  })
})

describe('treeLabel', () => {
  it('combines acronym and name, collapsing the fallback case', () => {
    expect(treeLabel(makeRow('a'))).toBe('A — Name of a')
    expect(treeLabel(makeRow('a', { acronym: 'Name of a' }))).toBe('Name of a')
  })
})

describe('filterForest', () => {
  it('keeps matching nodes and their ancestors, drops the rest', () => {
    const { forest: kept, expandedIds } = filterForest(forest(), 'shared')
    expect(kept).toHaveLength(2)
    expect(kept[0].uid).toBe('r1')
    expect(kept[0].subRows?.[0].uid).toBe('a')
    expect(kept[0].subRows?.[0].subRows?.[0].uid).toBe('shared@@r1')
    // descendants of a match that do not match themselves are dropped
    expect(kept[0].subRows?.[0].subRows?.[0].subRows).toBeUndefined()
    expect(expandedIds).toEqual(expect.arrayContaining(['r1', 'a', 'r2']))
    expect(expandedIds).not.toContain('shared@@r1')
  })

  it('matches regardless of case and diacritics', () => {
    const rows = [
      makeRow('r1', { subRows: [makeRow('a', { name: 'Écologie' })] }),
    ]
    const { forest: kept } = filterForest(rows, 'ecolo')
    expect(kept[0].subRows?.[0].uid).toBe('a')
  })

  it('returns an empty forest when nothing matches', () => {
    const { forest: kept, expandedIds } = filterForest(forest(), 'zzz')
    expect(kept).toEqual([])
    expect(expandedIds).toEqual([])
  })
})

describe('buildTreeItems', () => {
  it('mirrors the forest as RichTreeView items', () => {
    const items = buildTreeItems(forest())
    expect(items[0].id).toBe('r1')
    expect(items[0].label).toBe('R1 — Name of r1')
    expect(items[0].children?.[0].id).toBe('a')
    expect(items[1].children?.[0].children?.[0].id).toBe('leaf@@r2')
    expect(items[1].children?.[0].children?.[0].children).toBeUndefined()
  })
})

// Group labels are resolved by the caller; the key itself is enough here.
const label = (key: StructureGroupKey): string => key

describe('groupOf', () => {
  it('buckets each category', () => {
    expect(
      groupOf({
        category: OrganizationCategory.research_unit,
        nationalType: null,
      }),
    ).toBe('teaching_research')
    expect(
      groupOf({
        category: OrganizationCategory.teaching_unit,
        nationalType: null,
      }),
    ).toBe('teaching_research')
    expect(
      groupOf({
        category: OrganizationCategory.support_unit,
        nationalType: null,
      }),
    ).toBe('libraries')
    expect(
      groupOf({
        category: OrganizationCategory.administrative_unit,
        nationalType: null,
      }),
    ).toBe('general_services')
    expect(
      groupOf({
        category: OrganizationCategory.doctoral_school,
        nationalType: null,
      }),
    ).toBe('other')
    expect(
      groupOf({ category: OrganizationCategory.team, nationalType: 'TEAM' }),
    ).toBe('other')
  })

  it('lets the first matching condition win', () => {
    // UFR outranks the category, whatever that category would have given.
    expect(
      groupOf({
        category: OrganizationCategory.support_unit,
        nationalType: 'UFR',
      }),
    ).toBe('teaching_research')
    expect(
      groupOf({
        category: OrganizationCategory.administrative_unit,
        nationalType: 'ufr',
      }),
    ).toBe('teaching_research')
  })
})

describe('decorateForest', () => {
  const institution = (): StructureRow[] => [
    makeRow('inst', {
      category: OrganizationCategory.institution,
      subRows: [
        makeRow('zeta', { category: OrganizationCategory.research_unit }),
        makeRow('alpha', { category: OrganizationCategory.support_unit }),
        makeRow('beta', { category: OrganizationCategory.administrative_unit }),
        makeRow('gamma', { category: OrganizationCategory.doctoral_school }),
        makeRow('delta', {
          category: OrganizationCategory.support_unit,
          nationalType: 'UFR',
        }),
      ],
    }),
  ]

  it('sorts roots alphabetically', () => {
    const decorated = decorateForest(
      [makeRow('zulu'), makeRow('alpha'), makeRow('mike')],
      label,
      'fr',
    )
    expect(decorated.map((row) => row.uid)).toEqual(['alpha', 'mike', 'zulu'])
  })

  it('sorts siblings alphabetically at depth', () => {
    const decorated = decorateForest(
      [
        makeRow('r', {
          subRows: [makeRow('c'), makeRow('a'), makeRow('b')],
        }),
      ],
      label,
      'fr',
    )
    expect(decorated[0].subRows?.map((row) => row.uid)).toEqual(['a', 'b', 'c'])
  })

  it('groups the children of an institution in a fixed order', () => {
    const decorated = decorateForest(institution(), label, 'fr')
    const groups = decorated[0].subRows ?? []
    expect(groups.map((group) => group.groupKey)).toEqual([
      'teaching_research',
      'libraries',
      'general_services',
      'other',
    ])
    expect(groups.map((group) => group.uid)).toEqual([
      groupNodeId('teaching_research', 'inst'),
      groupNodeId('libraries', 'inst'),
      groupNodeId('general_services', 'inst'),
      groupNodeId('other', 'inst'),
    ])
    // sorted inside each group; UFR wins over support_unit for "delta"
    expect(groups[0].subRows?.map((row) => row.uid)).toEqual(['delta', 'zeta'])
    expect(groups[1].subRows?.map((row) => row.uid)).toEqual(['alpha'])
    expect(groups[2].subRows?.map((row) => row.uid)).toEqual(['beta'])
    expect(groups[3].subRows?.map((row) => row.uid)).toEqual(['gamma'])
  })

  it('places every child in exactly one group', () => {
    const decorated = decorateForest(institution(), label, 'fr')
    const placed = (decorated[0].subRows ?? []).flatMap((group) =>
      (group.subRows ?? []).map((row) => row.uid),
    )
    expect(placed.sort()).toEqual(['alpha', 'beta', 'delta', 'gamma', 'zeta'])
  })

  it('drops the empty groups', () => {
    const decorated = decorateForest(
      [
        makeRow('inst', {
          category: OrganizationCategory.institution,
          subRows: [makeRow('a', { category: OrganizationCategory.team })],
        }),
      ],
      label,
      'fr',
    )
    expect(decorated[0].subRows?.map((group) => group.groupKey)).toEqual([
      'other',
    ])
  })

  it('leaves non-institution parents ungrouped', () => {
    const decorated = decorateForest(
      [
        makeRow('unit', {
          category: OrganizationCategory.research_unit,
          subRows: [
            makeRow('t2', { category: OrganizationCategory.team }),
            makeRow('t1', { category: OrganizationCategory.support_unit }),
          ],
        }),
      ],
      label,
      'fr',
    )
    expect(decorated[0].subRows?.map((row) => row.uid)).toEqual(['t1', 't2'])
    expect(decorated[0].subRows?.every((row) => !row.groupKey)).toBe(true)
  })

  it('puts the group in the ancestor chain of a grouped structure', () => {
    const decorated = decorateForest(institution(), label, 'fr')
    const index = indexForest(decorated)
    expect(index.firstNodeIdByUid.get('alpha')).toBe('alpha')
    expect(ancestorsOf('alpha', index.parentByNodeId)).toEqual([
      groupNodeId('libraries', 'inst'),
      'inst',
    ])
    expect(index.expandableNodeIds).toContain(groupNodeId('libraries', 'inst'))
  })

  it('produces group ids that isGroupNodeId recognises', () => {
    const decorated = decorateForest(institution(), label, 'fr')
    expect(isGroupNodeId(decorated[0].uid)).toBe(false)
    expect((decorated[0].subRows ?? []).every((g) => isGroupNodeId(g.uid))).toBe(
      true,
    )
  })
})

describe('filterForest with group headers', () => {
  const decorated = () =>
    decorateForest(
      [
        makeRow('inst', {
          category: OrganizationCategory.institution,
          subRows: [
            makeRow('bu', { category: OrganizationCategory.support_unit }),
          ],
        }),
      ],
      label,
      'fr',
    )

  it('never matches a group header on its own label', () => {
    expect(filterForest(decorated(), 'libraries').forest).toEqual([])
  })

  it('keeps the group when one of its structures matches', () => {
    const { forest: kept } = filterForest(decorated(), 'bu')
    expect(kept[0].subRows?.[0].groupKey).toBe('libraries')
    expect(kept[0].subRows?.[0].subRows?.[0].uid).toBe('bu')
  })
})

describe('visibleChildren', () => {
  it('flattens the group headers away', () => {
    const decorated = decorateForest(
      [
        makeRow('inst', {
          category: OrganizationCategory.institution,
          subRows: [
            makeRow('b', { category: OrganizationCategory.support_unit }),
            makeRow('a', { category: OrganizationCategory.research_unit }),
          ],
        }),
      ],
      label,
      'fr',
    )
    expect(visibleChildren(decorated[0]).map((row) => row.uid)).toEqual([
      'a',
      'b',
    ])
  })

  it('returns plain children unchanged and copes with leaves', () => {
    expect(
      visibleChildren(makeRow('r', { subRows: [makeRow('a')] })).map(
        (row) => row.uid,
      ),
    ).toEqual(['a'])
    expect(visibleChildren(makeRow('leaf'))).toEqual([])
  })
})

describe('clampPanelWidth', () => {
  it('clamps to the allowed range and rounds', () => {
    expect(clampPanelWidth(10)).toBe(PANEL_WIDTH.min)
    expect(clampPanelWidth(10_000)).toBe(PANEL_WIDTH.max)
    expect(clampPanelWidth(420.6)).toBe(421)
  })
})
