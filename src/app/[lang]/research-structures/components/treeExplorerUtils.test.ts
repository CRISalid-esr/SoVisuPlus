import { OrganizationCategory } from '@prisma/client'
import { StructureRow } from './directoryRows'
import {
  ancestorsOf,
  buildTreeItems,
  filterForest,
  indexForest,
  normalizeForSearch,
  treeLabel,
} from './treeExplorerUtils'

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
