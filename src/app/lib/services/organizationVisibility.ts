/**
 * Effective visibility of the organization structures.
 *
 * `OrganizationUnit.hidden` records what a structure_manager toggled;
 * `OrganizationUnit.hiddenEffective` records what the tree rules derive from
 * it, and is the flag every read path filters on. Keeping the two apart is
 * what makes unhiding correct: a structure explicitly hidden inside a hidden
 * subtree must stay hidden when its ancestor comes back.
 */

export interface VisibilityUnit {
  uid: string
  hidden: boolean
}

export interface VisibilityRelation {
  childUid: string
  parentUid: string
}

/**
 * The effectively hidden structures:
 *
 *   effective(u) = u.hidden || (u has parents && every parent is effective)
 *
 * Both relationship kinds (`part_of` and `member_of`) count as parent links,
 * matching the edge set `buildDirectoryForest` walks. A structure with no
 * parent is hidden only when explicitly hidden, and one that still has a
 * visible parent stays visible — it simply shows under that parent.
 *
 * The propagation is monotone (a unit is only ever added to the set), so a
 * parent-pointer cycle in bad upstream data converges instead of hiding the
 * whole cycle.
 */
export const computeEffectiveHidden = (
  units: VisibilityUnit[],
  relations: VisibilityRelation[],
): Set<string> => {
  const known = new Set(units.map((unit) => unit.uid))

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  for (const relation of relations) {
    if (
      !known.has(relation.childUid) ||
      !known.has(relation.parentUid) ||
      relation.childUid === relation.parentUid
    ) {
      continue
    }
    parentsOf.set(relation.childUid, [
      ...(parentsOf.get(relation.childUid) ?? []),
      relation.parentUid,
    ])
    childrenOf.set(relation.parentUid, [
      ...(childrenOf.get(relation.parentUid) ?? []),
      relation.childUid,
    ])
  }

  const hidden = new Set(
    units.filter((unit) => unit.hidden).map((unit) => unit.uid),
  )

  // Only a descendant of a newly hidden unit can become hidden in turn, so the
  // worklist carries the children of every unit that just entered the set.
  const queue = [...hidden]
  for (let next = 0; next < queue.length; next++) {
    for (const childUid of childrenOf.get(queue[next]) ?? []) {
      if (hidden.has(childUid)) {
        continue
      }
      const parents = parentsOf.get(childUid) ?? []
      if (parents.length > 0 && parents.every((uid) => hidden.has(uid))) {
        hidden.add(childUid)
        queue.push(childUid)
      }
    }
  }

  return hidden
}
