import { OrganizationCategory, OrganizationRelationKind } from '@prisma/client'
import {
  OrganizationDirectoryEntry,
  OrganizationDirectoryParent,
} from '@/types/OrganizationDirectory'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export type ReferenceKind = 'co_supervision' | 'attachment'

export interface StructureRow {
  uid: string
  slug: string | null
  acronym: string
  name: string
  category: OrganizationCategory
  nationalType: string | null
  external: boolean
  institutionNames: string[]
  membersCount: number
  publicationsCount: number
  oaRate: number
  halRate: number
  parents: OrganizationDirectoryParent[]
  isReference?: boolean
  originalUid?: string
  referenceKind?: ReferenceKind
  subRows?: StructureRow[]
}

const displayName = (
  entry: OrganizationDirectoryEntry,
  lang: ExtendedLanguageCode,
): string =>
  entry.names.find((name) => name.language === lang)?.value ??
  entry.names[0]?.value ??
  ''

/**
 * Flat table rows from the directory payload. The supervising institution
 * names (Tutelles column) are resolved against the full payload, so they
 * show regardless of the external switch — an attribute, not a row.
 */
export const buildRows = (
  entries: OrganizationDirectoryEntry[],
  lang: ExtendedLanguageCode,
): StructureRow[] => {
  const byUid = new Map(entries.map((entry) => [entry.uid, entry]))
  return entries.map((entry) => {
    const institutionNames = entry.parents
      .filter(
        (parent) =>
          parent.kind === OrganizationRelationKind.member_of &&
          byUid.get(parent.parentUid)?.category ===
            OrganizationCategory.institution,
      )
      .map((parent) => {
        const institution = byUid.get(parent.parentUid)!
        return institution.acronym ?? displayName(institution, lang)
      })
      .filter((name) => name !== '')
    return {
      uid: entry.uid,
      slug: entry.slug,
      acronym: entry.acronym ?? displayName(entry, lang) ?? entry.uid,
      name: displayName(entry, lang),
      category: entry.category,
      nationalType: entry.nationalType,
      external: entry.external,
      institutionNames,
      membersCount: entry.membersCount,
      publicationsCount: entry.publicationsCount,
      oaRate: entry.oaRate,
      halRate: entry.halRate,
      parents: entry.parents,
    }
  })
}

export const filterVisible = (
  rows: StructureRow[],
  includeExternal: boolean,
): StructureRow[] =>
  includeExternal ? rows : rows.filter((row) => !row.external)

/**
 * Hierarchical placement over the visible rows. The structure graph is a
 * DAG — the view follows both part_of and member_of, so a structure appears
 * under every visible parent: fully expanded (with children) under exactly
 * one primary placement, as a childless reference node everywhere else.
 *
 * Primary placement priority: first part_of parent; else the member_of
 * parent with position main_supervision; else the first member_of parent;
 * else the structure is a root.
 */
export const buildDirectoryDag = (rows: StructureRow[]): StructureRow[] => {
  const byUid = new Map(
    rows.map((row) => [row.uid, { ...row, subRows: [] as StructureRow[] }]),
  )
  const roots: StructureRow[] = []

  for (const node of byUid.values()) {
    const visibleParents = node.parents.filter((parent) =>
      byUid.has(parent.parentUid),
    )
    const primary =
      visibleParents.find(
        (parent) => parent.kind === OrganizationRelationKind.part_of,
      ) ??
      visibleParents.find(
        (parent) =>
          parent.kind === OrganizationRelationKind.member_of &&
          parent.position === 'main_supervision',
      ) ??
      visibleParents.find(
        (parent) => parent.kind === OrganizationRelationKind.member_of,
      ) ??
      null

    if (primary) {
      byUid.get(primary.parentUid)!.subRows!.push(node)
    } else {
      roots.push(node)
    }

    for (const parent of visibleParents) {
      if (parent === primary) {
        continue
      }
      const parentNode = byUid.get(parent.parentUid)!
      parentNode.subRows!.push({
        ...node,
        uid: `${node.uid}__ref__${parent.parentUid}`,
        originalUid: node.uid,
        isReference: true,
        referenceKind:
          parent.kind === OrganizationRelationKind.member_of &&
          parentNode.category === OrganizationCategory.institution
            ? 'co_supervision'
            : 'attachment',
        subRows: undefined,
        parents: [],
      })
    }
  }

  // Relationship cycles would make nodes unreachable from the roots: rescue
  // them as roots rather than silently dropping them.
  const reachable = new Set<string>()
  const visit = (node: StructureRow) => {
    if (reachable.has(node.uid)) {
      return
    }
    reachable.add(node.uid)
    node.subRows?.forEach(visit)
  }
  roots.forEach(visit)
  for (const node of byUid.values()) {
    if (!reachable.has(node.uid)) {
      roots.push(node)
      visit(node)
    }
  }

  // The path set stops the expansion when a cycle loops back on itself.
  const clean = (nodes: StructureRow[], path: Set<string>): StructureRow[] =>
    nodes.map((node) => {
      if (path.has(node.uid) || !node.subRows || node.subRows.length === 0) {
        return { ...node, subRows: undefined }
      }
      const nextPath = new Set(path)
      nextPath.add(node.uid)
      return { ...node, subRows: clean(node.subRows, nextPath) }
    })
  return clean(roots, new Set())
}
