import { TreeViewBaseItem } from '@mui/x-tree-view/models'
import { OrganizationCategory } from '@prisma/client'
import { StructureRow } from './directoryRows'
import {
  groupNodeId,
  groupOf,
  isGroupNodeId,
  STRUCTURE_GROUP_ORDER,
  StructureGroupKey,
} from './structureGroups'

export interface ForestIndex {
  rowByNodeId: Map<string, StructureRow>
  parentByNodeId: Map<string, string | null>
  firstNodeIdByUid: Map<string, string>
  expandableNodeIds: string[]
}

/**
 * Single traversal of the forest: node lookup, parent pointers for ancestor
 * expansion, first occurrence in tree order of each structure uid (a
 * structure duplicated across roots resolves to its first occurrence), and
 * the ids that can be expanded.
 */
export const indexForest = (forest: StructureRow[]): ForestIndex => {
  const rowByNodeId = new Map<string, StructureRow>()
  const parentByNodeId = new Map<string, string | null>()
  const firstNodeIdByUid = new Map<string, string>()
  const expandableNodeIds: string[] = []
  const visit = (node: StructureRow, parentId: string | null) => {
    rowByNodeId.set(node.uid, node)
    parentByNodeId.set(node.uid, parentId)
    const originalUid = node.originalUid ?? node.uid
    if (!firstNodeIdByUid.has(originalUid)) {
      firstNodeIdByUid.set(originalUid, node.uid)
    }
    if (node.subRows && node.subRows.length > 0) {
      expandableNodeIds.push(node.uid)
      node.subRows.forEach((child) => visit(child, node.uid))
    }
  }
  forest.forEach((root) => visit(root, null))
  return { rowByNodeId, parentByNodeId, firstNodeIdByUid, expandableNodeIds }
}

export const ancestorsOf = (
  nodeId: string,
  parentByNodeId: Map<string, string | null>,
): string[] => {
  const ancestors: string[] = []
  let current = parentByNodeId.get(nodeId) ?? null
  while (current !== null) {
    ancestors.push(current)
    current = parentByNodeId.get(current) ?? null
  }
  return ancestors
}

export const normalizeForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const treeLabel = (row: StructureRow): string =>
  row.name && row.name !== row.acronym
    ? `${row.acronym} — ${row.name}`
    : row.acronym

/**
 * Keep the nodes whose label matches the query and their ancestors. The
 * returned expandedIds are the kept nodes that still have children — the
 * ancestor chain of every match — so the tree can auto-expand them.
 */
export const filterForest = (
  forest: StructureRow[],
  query: string,
): { forest: StructureRow[]; expandedIds: string[] } => {
  const normalizedQuery = normalizeForSearch(query)
  const expandedIds: string[] = []
  const filterNode = (node: StructureRow): StructureRow | null => {
    // A group header is a container, not a result: it survives only when one
    // of its structures matches.
    const matches =
      !isGroupNodeId(node.uid) &&
      normalizeForSearch(treeLabel(node)).includes(normalizedQuery)
    const subRows = (node.subRows ?? [])
      .map(filterNode)
      .filter((child): child is StructureRow => child !== null)
    if (!matches && subRows.length === 0) {
      return null
    }
    if (subRows.length > 0) {
      expandedIds.push(node.uid)
    }
    return { ...node, subRows: subRows.length > 0 ? subRows : undefined }
  }
  return {
    forest: forest
      .map(filterNode)
      .filter((root): root is StructureRow => root !== null),
    expandedIds,
  }
}

export const buildTreeItems = (forest: StructureRow[]): TreeViewBaseItem[] =>
  forest.map((node) => ({
    id: node.uid,
    label: treeLabel(node),
    children:
      node.subRows && node.subRows.length > 0
        ? buildTreeItems(node.subRows)
        : undefined,
  }))

/**
 * Display transform applied on top of `buildDirectoryForest`, for the
 * Arborescence tree only:
 *
 * - every sibling list — roots included — is sorted alphabetically on the
 *   label as displayed (`treeLabel`), so what the eye scans is what is sorted;
 * - the children of an institution are additionally bucketed into the four
 *   `STRUCTURE_GROUP_ORDER` groups behind synthetic, non-selectable header
 *   rows. Empty groups are dropped.
 *
 * Group headers are plain `StructureRow`s carrying a `groupKey` and a
 * namespaced uid, so `indexForest`, `ancestorsOf`, `filterForest` and
 * `buildTreeItems` keep working on them unchanged — in particular the ancestor
 * chain of a deep-linked structure now includes its group, which is exactly
 * what the expansion needs.
 */
export const decorateForest = (
  forest: StructureRow[],
  groupLabel: (key: StructureGroupKey) => string,
  locale: string,
): StructureRow[] => {
  const byLabel = (left: StructureRow, right: StructureRow): number =>
    treeLabel(left).localeCompare(treeLabel(right), locale, {
      sensitivity: 'base',
      numeric: true,
    })

  const makeGroup = (
    key: StructureGroupKey,
    parentNodeId: string,
    members: StructureRow[],
  ): StructureRow => ({
    uid: groupNodeId(key, parentNodeId),
    slug: null,
    acronym: groupLabel(key),
    name: groupLabel(key),
    // Never read: a group row is not selectable, never reaches the detail
    // panel, and is not itself bucketed. The field is only required by the type.
    category: OrganizationCategory.institution_subdivision,
    nationalType: null,
    external: false,
    hidden: false,
    hiddenEffective: false,
    institutionNames: [],
    membersCount: 0,
    publicationsCount: 0,
    oaRate: 0,
    halRate: 0,
    parents: [],
    groupKey: key,
    subRows: members,
  })

  const decorate = (node: StructureRow): StructureRow => {
    const children = (node.subRows ?? []).map(decorate).sort(byLabel)
    if (children.length === 0) {
      return { ...node, subRows: undefined }
    }
    if (node.category !== OrganizationCategory.institution) {
      return { ...node, subRows: children }
    }
    const buckets = new Map<StructureGroupKey, StructureRow[]>()
    for (const child of children) {
      const key = groupOf(child)
      buckets.set(key, [...(buckets.get(key) ?? []), child])
    }
    const groups = STRUCTURE_GROUP_ORDER.filter((key) => buckets.has(key)).map(
      (key) => makeGroup(key, node.uid, buckets.get(key)!),
    )
    return { ...node, subRows: groups }
  }

  return forest.map(decorate).sort(byLabel)
}

/**
 * The real structures under a node, skipping the synthetic group headers.
 * Used by the detail panel, which lists actual children rather than buckets.
 */
export const visibleChildren = (row: StructureRow): StructureRow[] =>
  (row.subRows ?? []).flatMap((child) =>
    child.groupKey ? (child.subRows ?? []) : [child],
  )

export const PANEL_WIDTH = { min: 240, max: 720, default: 360 } as const

export const PANEL_WIDTH_KEY = 'structures-tree-panel-width'

export const clampPanelWidth = (width: number): number =>
  Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, Math.round(width)))
