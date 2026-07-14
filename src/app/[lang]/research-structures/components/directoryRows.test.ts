import {
  buildDirectoryDag,
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

describe('buildDirectoryDag', () => {
  const dagRows = (entries: OrganizationDirectoryEntry[], external = true) =>
    buildDirectoryDag(filterVisible(buildRows(entries, 'en'), external))

  const flatten = (
    nodes: StructureRow[],
    depth = 0,
  ): { uid: string; depth: number; isReference?: boolean }[] =>
    nodes.flatMap((node) => [
      { uid: node.uid, depth, isReference: node.isReference },
      ...flatten(node.subRows ?? [], depth + 1),
    ])

  it('places each structure under its primary parent and references elsewhere', () => {
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
    ]
    const tree = dagRows(entries)
    const all = flatten(tree)

    // fully expanded under the main supervision
    expect(all).toContainEqual({ uid: 'ru1', depth: 1, isReference: undefined })
    // reference node under the co-supervisor
    const reference = all.find((node) => node.uid === 'ru1__ref__cnrs')
    expect(reference).toMatchObject({ depth: 1, isReference: true })
  })

  it('prefers part_of over member_of for the primary placement', () => {
    const entries = [
      makeEntry({
        uid: 'axis',
        category: OrganizationCategory.unit_subdivision,
        genericType: OrganizationGenericType.unit_subdivision,
      }),
      institution('up1'),
      makeEntry({
        uid: 'team1',
        category: OrganizationCategory.team,
        genericType: OrganizationGenericType.team,
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: null },
          { parentUid: 'axis', kind: 'part_of', position: null },
        ],
      }),
    ]
    const tree = dagRows(entries)
    const axis = tree.find((node) => node.uid === 'axis')!
    expect(axis.subRows!.map((node) => node.uid)).toEqual(['team1'])
    const up1 = tree.find((node) => node.uid === 'up1')!
    expect(up1.subRows!.map((node) => node.uid)).toEqual(['team1__ref__up1'])
  })

  it('tags references under institutions as co-supervision, others as attachment', () => {
    const entries = [
      institution('up1'),
      makeEntry({
        uid: 'fac',
        category: OrganizationCategory.institution_subdivision,
        genericType: OrganizationGenericType.institution_subdivision,
      }),
      makeEntry({
        uid: 'ru1',
        parents: [
          { parentUid: 'fac', kind: 'part_of', position: null },
          { parentUid: 'up1', kind: 'member_of', position: null },
        ],
      }),
      makeEntry({
        uid: 'ru2',
        parents: [
          { parentUid: 'up1', kind: 'member_of', position: 'main_supervision' },
          { parentUid: 'fac', kind: 'member_of', position: null },
        ],
      }),
    ]
    const tree = dagRows(entries)
    const up1 = tree.find((node) => node.uid === 'up1')!
    expect(
      up1.subRows!.find((node) => node.uid === 'ru1__ref__up1')?.referenceKind,
    ).toBe('co_supervision')
    const fac = tree.find((node) => node.uid === 'fac')!
    expect(
      fac.subRows!.find((node) => node.uid === 'ru2__ref__fac')?.referenceKind,
    ).toBe('attachment')
  })

  it('recomputes placement against the visible set when externals are hidden', () => {
    const entries = [
      institution('ror-x', true),
      makeEntry({
        uid: 'ru1',
        parents: [{ parentUid: 'ror-x', kind: 'member_of', position: null }],
      }),
    ]
    const withExternal = dagRows(entries, true)
    expect(withExternal.map((node) => node.uid)).toEqual(['ror-x'])
    expect(withExternal[0].subRows!.map((node) => node.uid)).toEqual(['ru1'])

    const withoutExternal = dagRows(entries, false)
    expect(withoutExternal.map((node) => node.uid)).toEqual(['ru1'])
    expect(withoutExternal[0].subRows).toBeUndefined()
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
    const tree = dagRows(entries)
    const rootUids = tree.map((node) => node.uid)
    expect(rootUids).toContain('orphan')
    // the cycle is rescued as a root instead of disappearing
    expect(rootUids.some((uid) => uid === 'a' || uid === 'b')).toBe(true)
    // and the expansion terminates
    expect(flatten(tree).length).toBeLessThan(10)
  })
})
