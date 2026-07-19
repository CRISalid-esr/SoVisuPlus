# Restructure the structures view — tree-based master-detail view as default

## Intent

The research-structures page (`src/app/[lang]/research-structures/page.tsx`) currently has two
tabs: "Vue à plat" (flat MRT table) and "Vue hiérarchique" (MRT table with subrows). Neither is a
good entry point for browsing the organisational hierarchy. This feature adds a third,
tree-based master-detail view and makes it the default tab.

## Target state

The page has **three tabs**, in this order, with French labels:

1. **"Arborescence"** (new, DEFAULT tab) — master-detail view described below
2. **"Liste"** — the existing flat table, unchanged (tab renamed only)
3. **"Table hiérarchique"** — the existing subrow table, unchanged (tab renamed only)

## The "Arborescence" view

Master-detail layout filling the available height.

### Left panel (~360px, scrollable, right border)

- `RichTreeView` from `@mui/x-tree-view` (already a dependency, `^8.14.1`, MIT).
- Build `items` (`{ id, label, children }`) from the **same forest** the hierarchical table uses:
  `buildDirectoryForest(structures, includeExternal)` in
  `src/app/[lang]/research-structures/components/directoryRows.ts`. Do not build a second tree
  algorithm — map `StructureRow.subRows` to TreeView `children`. The tree semantics (roots,
  `part_of`/`member_of` placement, at-most-once-per-root duplication, external-switch
  promotion) are those of
  [`specs/refactor-organisational-tree/prompt.md`](../refactor-organisational-tree/prompt.md)
  and must not be reimplemented or altered here. Node ids are the existing
  `StructureRow.uid` values (non-root nodes already carry `uid@@rootUid` ids, which guarantees
  the id uniqueness `RichTreeView` requires even though the underlying data is a DAG).
- Controlled selection: `selectedItems` / `onSelectedItemsChange`.
- Controlled expansion: `expandedItems` / `onExpandedItemsChange`.
- Top-level structures collapsed by default.
- Above the tree: a small search `TextField` filtering nodes by label (case- and
  diacritics-insensitive — normalise with `String.prototype.normalize('NFD')` + strip
  combining marks). While filtering: keep matching nodes AND their ancestors, auto-expand
  ancestors of matches. Clearing the field restores the pre-filter expansion state.
- Optional toolbar buttons: "tout déplier" / "tout replier".

### Right panel (flex: 1, scrollable, padded)

- Nothing selected → neutral empty state ("Sélectionnez une structure" or similar).
- Structure selected → a detail component. **Note:** the "Vue hiérarchique" subrows are plain
  nested table rows, not a detail panel — there is no existing detail component to reuse. Adapt
  the row content instead:
  - Header: acronym + full name, national-type `Chip` (reuse the translation logic from
    `StructureNameCell.tsx`), "external" `Chip` when applicable, link to the dashboard
    (`/${lang}/dashboard?perspective=${slug}`).
  - KPI cards: members count, publications count, OA rate and HAL rate (reuse `RateBar`).
  - Direct children: if the selected structure has `subRows`, list them (simple list or small
    table); clicking a child selects it in the tree and expands the path to it.
  - Leave vertical space below — a members list will be added later.

### Behavior details

- Build a flat `Map<id, StructureRow>` (memoized, from the forest) to resolve the selected id to
  the full row object.
- URL sync via query param, matching the app convention (cf. `?tab=` on the documents page,
  `?perspective=` for the dashboard): **`?structure=<uid>`**. On page load with the param
  present: select that structure and expand its ancestors. The uid in the URL is the _bare_
  structure uid (not the `uid@@rootUid` node id); resolve it to a tree node on load.
- When a structure occurs in several places in the forest (DAG duplication), select and expand
  the **first occurrence in tree order**.
- Selecting a node must never collapse/expand it as a side effect beyond default TreeView
  behavior.
- The page-level "include external" switch keeps applying to the Arborescence view (it feeds
  `buildDirectoryForest` already).

## Decisions

- **No new dependency** — `@mui/x-tree-view` is already installed; only MIT/free packages, no
  MUI X Pro/Premium.
- **Branch has no issue number** — no GitHub issue existed when the branch was created;
  descriptive name follows the `send-global-contributor-update-message` precedent.
- **`?structure=<uid>`** rather than slug: `slug` is nullable on structures, uid is always
  present and stable.
- **Detail panel content**: header + KPIs + children list (adapted from the hierarchical table's
  columns), since no dedicated detail component exists.
- **Duplicate nodes**: URL-driven selection targets the first occurrence in tree order.
- Tab labels are new i18n keys — run `npm run i18n:extract` and fill in the French/English
  `msgstr` values; never add `.po` entries by hand.

## Open questions (defaults applied, revisit if needed)

1. Should a GitHub issue be created retroactively and the branch renamed to `<n>-…`?
2. Detail panel: are the KPI cards wanted from the start, or header + children only?
3. Should URL-selection of a duplicated structure prefer its `part_of` placement over the first
   occurrence in tree order?

## Key files

| Concern                   | File                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| Page + tabs + both tables | `src/app/[lang]/research-structures/page.tsx`                         |
| Forest builder + row type | `src/app/[lang]/research-structures/components/directoryRows.ts`      |
| Name cell (chips logic)   | `src/app/[lang]/research-structures/components/StructureNameCell.tsx` |
| Data slice                | `src/app/stores/organizationUnitSlice.ts` (`organization.directory`)  |
| API route                 | `src/app/api/organizations/directory/route.ts`                        |
| URL-sync example          | `src/app/[lang]/documents/page.tsx` (`?tab=` handling)                |
