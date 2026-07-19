import {
  buildDirectoryForest,
  buildRows,
  filterVisible,
  StructureRow,
} from './directoryRows'
import { OrganizationDirectoryEntry } from '@/types/OrganizationDirectory'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const makeEntry = (
  overrides: Partial<OrganizationDirectoryEntry> & { uid: string },
): OrganizationDirectoryEntry => ({
  slug: `org:${overrides.uid}`,
  acronym: overrides.uid.toUpperCase(),
  names: [{ value: `Name of ${overrides.uid}`, language: 'en' }] as never,
  category: OrganizationCategory.research_unit,
  genericType: OrganizationGenericType.unit,
  nationalType: null,
  external: false,
  parents: [],
  membersCount: 0,
  publicationsCount: 0,
  oaRate: 0,
  halRate: 0,
  ...overrides,
})

const institution = (uid: string, external = false) =>
  makeEntry({
    uid,
    category: OrganizationCategory.institution,
    genericType: OrganizationGenericType.institution,
    external,
  })

describe('buildRows', () => {
  it('resolves names by language and supervising institutions across the payload', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'ru1',
        names: [
          { value: 'EN name', language: 'en' },
          { value: 'Nom FR', language: 'fr' },
        ] as never,
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: 'main_supervision' },
        ],
      }),
    ]
    const rows = buildRows(entries, 'fr')
    const ru1 = rows.find((row) => row.uid === 'ru1')!
    expect(ru1.name).toBe('Nom FR')
    expect(ru1.institutionNames).toEqual(['UP1'])
  })

  it('lists external supervising institutions as attributes regardless of visibility', () => {
    const entries = [
      institution('ror-x', true),
      makeEntry({
        uid: 'ru1',
        parents: [{ parentUid: 'ror-x', kind: 'member_of', position: null }],
      }),
    ]
    const rows = filterVisible(buildRows(entries, 'en'), false)
    expect(rows.map((row) => row.uid)).toEqual(['ru1'])
    expect(rows[0].institutionNames).toEqual(['ROR-X'])
  })
})

describe('buildDirectoryForest', () => {
  const forest = (
    entries: OrganizationDirectoryEntry[],
    includeExternal = true,
  ) => buildDirectoryForest(buildRows(entries, 'en'), includeExternal)

  const flatten = (
    nodes: StructureRow[],
    depth = 0,
  ): { uid: string; originalUid: string | undefined; depth: number }[] =>
    nodes.flatMap((node) => [
      { uid: node.uid, originalUid: node.originalUid, depth },
      ...flatten(node.subRows ?? [], depth + 1),
    ])

  const childUids = (node: StructureRow): string[] =>
    (node.subRows ?? []).map((child) => child.originalUid!)

  const findChild = (node: StructureRow, uid: string): StructureRow =>
    node.subRows!.find((child) => child.originalUid === uid)!

  it('expands a co-supervised unit fully under every supervising institution', () => {
    const entries = [
      institution('up1'),
      institution('cnrs'),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: 'main_supervision' },
          { parentUid: 'cnrs', kind: 'member_of', position: null },
        ],
      }),
      makeEntry({
        uid: 'team1',
        category: OrganizationCategory.team,
        genericType: OrganizationGenericType.team,
        parents: [{ parentUid: 'ru1', kind: 'part_of', position: null }],
      }),
    ]
    const roots = forest(entries)
    expect(roots.map((root) => root.uid).sort()).toEqual(['cnrs', 'up1'])
    for (const root of roots) {
      const ru1 = findChild(root, 'ru1')
      expect(childUids(ru1)).toEqual(['team1'])
    }
    // row ids stay unique despite the duplication across roots
    const ids = flatten(roots).map((node) => node.uid)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps a structure once per root, at its deepest part_of placement', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'dept',
        category: OrganizationCategory.institution_subdivision,
        genericType: OrganizationGenericType.institution_subdivision,
        parents: [{ parentUid: 'up1', kind: 'part_of', position: null }],
      }),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'up1', kind: 'part_of', position: null },
          { parentUid: 'dept', kind: 'part_of', position: null },
        ],
      }),
    ]
    const [up1] = forest(entries)
    expect(childUids(up1)).toEqual(['dept'])
    expect(childUids(findChild(up1, 'dept'))).toEqual(['ru1'])
  })

  it('places member_of attachments at their deepest path too', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'ed',
        category: OrganizationCategory.doctoral_school,
        genericType: OrganizationGenericType.doctoral_school,
        parents: [{ parentUid: 'up1', kind: 'member_of', position: null }],
      }),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: null },
          { parentUid: 'ed', kind: 'member_of', position: null },
        ],
      }),
    ]
    const [up1] = forest(entries)
    expect(childUids(up1)).toEqual(['ed'])
    expect(childUids(findChild(up1, 'ed'))).toEqual(['ru1'])
  })

  it('lets part_of placement win over a member_of alternative', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'ru1',
        parents: [{ parentUid: 'up1', kind: 'member_of', position: null }],
      }),
      makeEntry({
        uid: 'team1',
        category: OrganizationCategory.team,
        genericType: OrganizationGenericType.team,
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: null },
          { parentUid: 'ru1', kind: 'part_of', position: null },
        ],
      }),
    ]
    const [up1] = forest(entries)
    expect(childUids(up1)).toEqual(['ru1'])
    expect(childUids(findChild(up1, 'ru1'))).toEqual(['team1'])
  })

  it('ignores main_supervision when a deeper path exists', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'ed',
        category: OrganizationCategory.doctoral_school,
        genericType: OrganizationGenericType.doctoral_school,
        parents: [{ parentUid: 'up1', kind: 'member_of', position: null }],
      }),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: 'main_supervision' },
          { parentUid: 'ed', kind: 'member_of', position: null },
        ],
      }),
    ]
    const [up1] = forest(entries)
    expect(childUids(up1)).toEqual(['ed'])
    expect(childUids(findChild(up1, 'ed'))).toEqual(['ru1'])
  })

  it('breaks equal-depth ties by data order', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'dept1',
        parents: [{ parentUid: 'up1', kind: 'part_of', position: null }],
      }),
      makeEntry({
        uid: 'dept2',
        parents: [{ parentUid: 'up1', kind: 'part_of', position: null }],
      }),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'dept1', kind: 'part_of', position: null },
          { parentUid: 'dept2', kind: 'part_of', position: null },
        ],
      }),
    ]
    const [up1] = forest(entries)
    expect(childUids(findChild(up1, 'dept1'))).toEqual(['ru1'])
    expect(findChild(up1, 'dept2').subRows).toBeUndefined()
  })

  it('keeps external roots in the topology and shows them when the switch is on', () => {
    const entries = [
      institution('cnrs', true),
      makeEntry({
        uid: 'ru1',
        parents: [{ parentUid: 'cnrs', kind: 'member_of', position: null }],
      }),
      makeEntry({
        uid: 'team1',
        category: OrganizationCategory.team,
        genericType: OrganizationGenericType.team,
        parents: [{ parentUid: 'ru1', kind: 'part_of', position: null }],
      }),
    ]
    const roots = forest(entries, true)
    expect(roots.map((root) => root.uid)).toEqual(['cnrs'])
    expect(childUids(roots[0])).toEqual(['ru1'])
  })

  it('promotes internal structures stranded under hidden externals, with their subtree', () => {
    const entries = [
      institution('cnrs', true),
      makeEntry({
        uid: 'ru1',
        parents: [{ parentUid: 'cnrs', kind: 'member_of', position: null }],
      }),
      makeEntry({
        uid: 'team1',
        category: OrganizationCategory.team,
        genericType: OrganizationGenericType.team,
        parents: [{ parentUid: 'ru1', kind: 'part_of', position: null }],
      }),
    ]
    const roots = forest(entries, false)
    expect(roots.map((root) => root.originalUid)).toEqual(['ru1'])
    expect(childUids(roots[0])).toEqual(['team1'])
  })

  it('does not promote a structure already visible elsewhere', () => {
    const entries = [
      institution('up1'),
      institution('cnrs', true),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: null },
          { parentUid: 'cnrs', kind: 'member_of', position: null },
        ],
      }),
    ]
    const roots = forest(entries, false)
    expect(roots.map((root) => root.originalUid)).toEqual(['up1'])
    const occurrences = flatten(roots).filter(
      (node) => node.originalUid === 'ru1',
    )
    expect(occurrences).toHaveLength(1)
  })

  it('keeps orphans as roots and survives relationship cycles', () => {
    const entries = [
      makeEntry({ uid: 'orphan' }),
      makeEntry({
        uid: 'a',
        parents: [{ parentUid: 'b', kind: 'part_of', position: null }],
      }),
      makeEntry({
        uid: 'b',
        parents: [{ parentUid: 'a', kind: 'part_of', position: null }],
      }),
    ]
    const roots = forest(entries)
    expect(roots.map((root) => root.originalUid)).toEqual(['orphan', 'a'])
    // the cycle is rescued as a finite branch instead of disappearing
    expect(childUids(roots[1])).toEqual(['b'])
    expect(flatten(roots)).toHaveLength(3)
  })
})
