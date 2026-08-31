import { OrganizationCategory, OrganizationRelationKind } from '@prisma/client'
import {
  OrganizationDirectoryEntry,
  OrganizationDirectoryParent,
} from '@/types/OrganizationDirectory'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import type { StructureGroupKey } from './structureGroups'
import { computeEffectiveHidden } from '@/lib/services/organizationVisibility'

export interface StructureRow {
  uid: string
  slug: string | null
  acronym: string
  name: string
  category: OrganizationCategory
  nationalType: string | null
  external: boolean
  /** Explicit visibility toggle — what a structure manager last set. */
  hidden: boolean
  /** Derived visibility: hidden itself, or hidden through all its parents. */
  hiddenEffective: boolean
  institutionNames: string[]
  membersCount: number
  publicationsCount: number
  oaRate: number
  halRate: number
  parents: OrganizationDirectoryParent[]
  originalUid?: string
  subRows?: StructureRow[]
  /**
   * Set only on the synthetic group header rows the Arborescence tree inserts
   * under institutions (see `decorateForest`). Never produced by `buildRows`
   * nor `buildDirectoryForest`.
   */
  groupKey?: StructureGroupKey
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
      hidden: entry.hidden,
      hiddenEffective: entry.hiddenEffective,
      institutionNames,
      membersCount: entry.membersCount,
      publicationsCount: entry.publicationsCount,
      oaRate: entry.oaRate,
      halRate: entry.halRate,
      parents: entry.parents,
    }
  })
}

/**
 * The rows a visibility toggle changes, with their new flags — the toggled
 * structure plus whatever the cascade takes with it, or gives back.
 *
 * Applied to the display immediately, so the switch and the tree react to the
 * click rather than to the round trip. The cascade is derived with
 * `computeEffectiveHidden`, the very rule the server applies, so the optimistic
 * state matches what the refetch confirms; that refetch is then only about the
 * KPIs, which do move when a structure leaves a perimeter.
 *
 * `displayed` is what is on screen, not the raw payload: after a hide the
 * payload no longer carries the hidden structures, and showing one again has to
 * see it to put it back.
 */
export const pendingVisibilityRows = (
  displayed: StructureRow[],
  uid: string,
  hidden: boolean,
): StructureRow[] => {
  const units = displayed.map((row) => ({
    uid: row.uid,
    hidden: row.uid === uid ? hidden : row.hidden,
  }))
  const relations = displayed.flatMap((row) =>
    row.parents.map((parent) => ({
      childUid: row.uid,
      parentUid: parent.parentUid,
    })),
  )
  const effective = computeEffectiveHidden(units, relations)

  return displayed
    .filter(
      (row) =>
        row.uid === uid || row.hiddenEffective !== effective.has(row.uid),
    )
    .map((row) => ({
      ...row,
      // Only the toggled structure is hidden in its own right; the rest of the
      // cascade is hidden through it, and its toggle stays disabled.
      hidden: row.uid === uid ? hidden : row.hidden,
      hiddenEffective: effective.has(row.uid),
    }))
}

/**
 * Directory rows with the pending visibility applied: the pending flags win
 * over the payload's, and a pending row the payload no longer carries is
 * appended — which is what keeps a just-hidden structure on screen until the
 * selection moves away. Everything else, KPIs included, comes from the payload.
 */
export const withPendingRows = (
  rows: StructureRow[],
  pending: StructureRow[],
): StructureRow[] => {
  if (pending.length === 0) {
    return rows
  }
  const byUid = new Map(pending.map((row) => [row.uid, row]))
  const known = new Set(rows.map((row) => row.uid))
  return [
    ...rows.map((row) => {
      const update = byUid.get(row.uid)
      return update
        ? {
            ...row,
            hidden: update.hidden,
            hiddenEffective: update.hiddenEffective,
          }
        : row
    }),
    ...pending.filter((row) => !known.has(row.uid)),
  ]
}

export const filterVisible = (
  rows: StructureRow[],
  includeExternal: boolean,
): StructureRow[] =>
  includeExternal ? rows : rows.filter((row) => !row.external)

/**
 * Hierarchical forest for the tree tab. The structure graph is a DAG — a
 * structure may have several parents (part_of, member_of) — but the view
 * needs trees, so:
 *
 * - Roots are the structures with no parent at all, internal or external:
 *   the topology is computed on the full dataset, visibility only applies
 *   afterwards.
 * - Under a given root a structure appears at most once, always carrying
 *   its children. Duplication across roots is expected (co-tutelles).
 * - Placement under a root: part_of paths are expanded first (a structure
 *   reachable by several part_of paths goes where it sits deepest), then
 *   member_of relations attach the remaining structures — each bringing its
 *   own part_of subtree — deepest placement again, ties resolved by data
 *   order. The member_of position (main_supervision) plays no role.
 * - When externals are hidden, an internal structure visible nowhere else
 *   is promoted to a root rather than silently dropped.
 */
export const buildDirectoryForest = (
  rows: StructureRow[],
  includeExternal: boolean,
): StructureRow[] => {
  const byUid = new Map(rows.map((row) => [row.uid, row]))

  const childrenByKind = (
    kind: OrganizationRelationKind,
  ): Map<string, string[]> => {
    const children = new Map<string, string[]>()
    for (const row of rows) {
      for (const parent of row.parents) {
        if (parent.kind !== kind || !byUid.has(parent.parentUid)) {
          continue
        }
        const siblings = children.get(parent.parentUid) ?? []
        if (!siblings.includes(row.uid)) {
          siblings.push(row.uid)
          children.set(parent.parentUid, siblings)
        }
      }
    }
    return children
  }
  const partOfChildren = childrenByKind(OrganizationRelationKind.part_of)
  const memberOfChildren = childrenByKind(OrganizationRelationKind.member_of)
  const hasPartOfParent = new Set(
    rows
      .filter((row) =>
        row.parents.some(
          (parent) =>
            parent.kind === OrganizationRelationKind.part_of &&
            byUid.has(parent.parentUid),
        ),
      )
      .map((row) => row.uid),
  )

  // One tree per root, as child → parent pointers.
  const buildTree = (rootUid: string): Map<string, string | null> => {
    const parentOf = new Map<string, string | null>([[rootUid, null]])

    // Depths by BFS over the parent pointers. Nodes a parent-pointer cycle
    // (bad data) makes unreachable are unplaced so the rescue pass can pick
    // them up.
    const currentDepths = (): Map<string, number> => {
      const childrenOf = new Map<string, string[]>()
      for (const [uid, parentUid] of parentOf) {
        if (parentUid !== null) {
          childrenOf.set(parentUid, [...(childrenOf.get(parentUid) ?? []), uid])
        }
      }
      const depths = new Map([[rootUid, 0]])
      const queue = [rootUid]
      for (let next = 0; next < queue.length; next++) {
        for (const childUid of childrenOf.get(queue[next]) ?? []) {
          if (!depths.has(childUid)) {
            depths.set(childUid, depths.get(queue[next])! + 1)
            queue.push(childUid)
          }
        }
      }
      for (const uid of [...parentOf.keys()]) {
        if (!depths.has(uid)) {
          parentOf.delete(uid)
        }
      }
      return depths
    }

    // Attach every unplaced structure reachable from the tree through
    // `edges`, each at the end of its longest simple path (deepest
    // placement, first-in-data-order tie-break). `defer` skips structures
    // that should ride a later part_of expansion instead.
    const expand = (
      edges: Map<string, string[]>,
      defer?: (uid: string) => boolean,
    ): boolean => {
      const depths = currentDepths()
      const before = parentOf.size
      const best = new Map<string, { parentUid: string; depth: number }>()
      const walk = (uid: string, depth: number, path: Set<string>) => {
        for (const childUid of edges.get(uid) ?? []) {
          if (
            parentOf.has(childUid) ||
            path.has(childUid) ||
            defer?.(childUid)
          ) {
            continue
          }
          const childDepth = depth + 1
          const currentBest = best.get(childUid)
          if (!currentBest || childDepth > currentBest.depth) {
            best.set(childUid, { parentUid: uid, depth: childDepth })
          }
          path.add(childUid)
          walk(childUid, childDepth, path)
          path.delete(childUid)
        }
      }
      for (const [uid, depth] of depths) {
        walk(uid, depth, new Set([uid]))
      }
      for (const [uid, placement] of best) {
        parentOf.set(uid, placement.parentUid)
      }
      // Mutually-deepest picks over cyclic data can form a parent cycle;
      // the cleanup unplaces it and the unchanged size ends the outer loop.
      currentDepths()
      return parentOf.size > before
    }

    for (;;) {
      if (expand(partOfChildren)) {
        continue
      }
      if (expand(memberOfChildren, (uid) => hasPartOfParent.has(uid))) {
        continue
      }
      // Structures whose part_of parents never joined this tree still get
      // their member_of attachment.
      if (!expand(memberOfChildren)) {
        break
      }
    }
    return parentOf
  }

  const rootUids = rows
    .filter((row) => !row.parents.some((parent) => byUid.has(parent.parentUid)))
    .map((row) => row.uid)

  const placedAnywhere = new Set<string>()
  const trees: { rootUid: string; parentOf: Map<string, string | null> }[] = []
  const addTree = (rootUid: string) => {
    const parentOf = buildTree(rootUid)
    trees.push({ rootUid, parentOf })
    parentOf.forEach((_, uid) => placedAnywhere.add(uid))
  }
  rootUids.forEach(addTree)
  // Relationship cycles have no parentless entry point: rescue the first
  // member in data order as a root so the island stays visible.
  for (const row of rows) {
    if (!placedAnywhere.has(row.uid)) {
      addTree(row.uid)
    }
  }

  const materialize = (tree: (typeof trees)[number]): StructureRow => {
    const childrenOf = new Map<string, string[]>()
    for (const row of rows) {
      const parentUid = tree.parentOf.get(row.uid)
      if (parentUid) {
        childrenOf.set(parentUid, [
          ...(childrenOf.get(parentUid) ?? []),
          row.uid,
        ])
      }
    }
    const toNode = (uid: string): StructureRow => {
      const subRows = (childrenOf.get(uid) ?? []).map(toNode)
      return {
        ...byUid.get(uid)!,
        // Row ids must be unique across the forest; a structure appears at
        // most once per root, so the root uid disambiguates duplicates.
        uid: uid === tree.rootUid ? uid : `${uid}@@${tree.rootUid}`,
        originalUid: uid,
        subRows: subRows.length > 0 ? subRows : undefined,
      }
    }
    return toNode(tree.rootUid)
  }
  const forest = trees.map(materialize)

  if (includeExternal) {
    return forest
  }

  // Hide external rows. Internal structures stranded inside hidden subtrees
  // are promoted to roots when they are visible nowhere else.
  const visibleUids = new Set<string>()
  const hiddenSubtrees: StructureRow[] = []
  const prune = (node: StructureRow): StructureRow | null => {
    if (node.external) {
      hiddenSubtrees.push(node)
      return null
    }
    visibleUids.add(node.originalUid!)
    const subRows = (node.subRows ?? [])
      .map(prune)
      .filter((child): child is StructureRow => child !== null)
    return { ...node, subRows: subRows.length > 0 ? subRows : undefined }
  }
  const visibleRoots = forest
    .map(prune)
    .filter((root): root is StructureRow => root !== null)

  const promoted: StructureRow[] = []
  while (hiddenSubtrees.length > 0) {
    const node = hiddenSubtrees.shift()!
    if (node.external || visibleUids.has(node.originalUid!)) {
      hiddenSubtrees.push(...(node.subRows ?? []))
      continue
    }
    const tree = prune(node)
    if (tree !== null) {
      promoted.push(tree)
    }
  }
  return [...visibleRoots, ...promoted]
}
