# Refactor the organisational tree construction

Branch: `refactor-organisational-tree`

## Context

The hierarchical tab of the research-structures page (`src/app/[lang]/research-structures/page.tsx`)
turns the flat directory payload into a tree via `buildDirectoryDag`
(`src/app/[lang]/research-structures/components/directoryRows.ts`). The current
algorithm gives every structure exactly one _primary_ placement (fully
expanded) and renders every other occurrence as a greyed, childless
_reference_ node (`isReference`, `referenceKind`). This refactor replaces that
model.

## New rules

### 1. No more reference ("greyed") nodes

Every occurrence of a structure in the tree is a full occurrence: it always
carries its children and can always be expanded. The `isReference` /
`referenceKind` mechanics and their rendering in `StructureNameCell`
disappear.

### 2. A structure appears at most once per root

Duplication is allowed **across** roots, not **within** a root's subtree.

Example: UMR 8103 – ISJPS is under co-tutelle Paris 1 / CNRS. It appears
fully expanded under Paris 1 **and** fully expanded under CNRS — but only
once inside each of those subtrees. The same holds recursively for its teams.

### 3. Roots

A structure with no parent at all — no `part_of` **and** no `member_of`
relation — is a root. This applies to internal and external structures alike:
root status is computed on the **full** dataset, before any visibility
filtering (the "include external" switch only affects display, not the
topology).

### 4. Tree construction, per root

For each root, the subtree is built in two phases:

**Phase 1 — `part_of` only.** Starting from the root, expand the transitive
`part_of` closure. If a structure is reachable through several `part_of`
paths within the same root, keep the placement where it sits **deepest** in
the tree; the other occurrences are dropped (its subtree moves with it).

**Phase 2 — `member_of` completion.** Attach the structures not yet placed
under this root through their `member_of` relations, onto nodes already in
the tree. Each structure attached this way brings its own `part_of` subtree
with it (subject to rule 2: anything already placed under this root in
phase 1 is not duplicated). Repeat until no more structures can be attached.
If a structure can be attached at several places, the same rule applies:
keep the **deepest** placement.

A structure already placed in phase 1 is never moved or duplicated by a
`member_of` edge: `part_of` placement takes absolute precedence, whatever the
depths.

### 5. Depth ties

When two candidate placements under the same root have the same depth, keep
the first one in data order (the order of the API payload). Deterministic,
no smarter criterion.

### 6. `main_supervision` no longer matters

The `position` field of `member_of` relations (`main_supervision`) plays no
role in placement anymore. Placement is purely structural: `part_of` first,
then `member_of`, deepest path wins.

### 7. External switch

The tree topology is computed on the full dataset (rule 3). The "include
external" switch only controls which rows are rendered:

- Switch ON: everything is shown.
- Switch OFF: external structures are hidden. An internal structure whose
  every path to a root goes through hidden external ancestors is **promoted
  to a visible root** (with its subtree) rather than silently disappearing.
  A structure that is already visible elsewhere in the forest is **not**
  promoted (no top-level duplicates).

### 8. Safety

Relationship cycles in the data must not crash or loop the build. Note that
under the deepest-placement rule a cycle makes depth unbounded, so the
algorithm must detect cycles and stop expanding a path when a structure
reappears on its own ancestor chain (keep the spirit of the current
rescue + path-cut passes).

## Out of scope

- The flat tab, CSV export, KPI columns and dashboard links are unchanged.
- The directory payload (`OrganizationDirectoryEntry`) is unchanged — this is
  a pure client-side rework of `directoryRows.ts` and its consumers.

## Decisions (confirmed)

1. **External off** — orphaned internal structures are promoted to roots.
2. **`main_supervision`** — fully dropped from placement logic.
3. **`part_of` vs `member_of`** — `part_of` placement always wins.
4. **Depth tie-break** — first in data order.

## Implementation notes

- Row ids must stay unique for MaterialReactTable: duplicates across roots
  need synthetic ids (e.g. suffix with the root or parent uid), with the real
  uid kept in `originalUid` for navigation and rendering.
- `directoryRows.test.ts` must be rewritten around the new rules: multi-root
  duplication, deepest-placement (both phases), promotion of orphans when
  externals are hidden, cycle handling.
