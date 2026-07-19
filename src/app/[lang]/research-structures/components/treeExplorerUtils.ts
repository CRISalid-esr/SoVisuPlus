import { TreeViewBaseItem } from '@mui/x-tree-view/models'
import { StructureRow } from './directoryRows'

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
    const matches = normalizeForSearch(treeLabel(node)).includes(
      normalizedQuery,
    )
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
