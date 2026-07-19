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
  - Members table (phase 2, below the children list) — see next section.

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

## Members table (phase 2)

A paginated members table at the bottom of the detail panel showing the people attached to the
selected structure.

### Who is listed

- **`OrganizationCategory.institution`** → people with an **`Employment`** row on the
  institution (NOT the memberships of included structures).
- **Every other category** → people with a **direct `Membership`** row on the structure itself
  (no perimeter/sub-structure aggregation — children's members are seen by selecting the
  child). The count may therefore be smaller than the KPI card's `membersCount`, which uses
  the directory perimeter rules.

### "Actuellement présents" switch

Above the table, default **ON**. A person is present when the membership/employment `endDate`
is null **or** in the future. Start/end dates are mostly missing in today's data, so with the
switch on everyone shows — the filter becomes meaningful when the ETL provides dates.

### Table

Material React Table with **server-side** pagination (10/20/50, default 10), sorting and
name search (manual\* flags + `rowCount`, following the publications-table pattern). Columns:

| Column       | Content                                                                                                                                                     | Sortable                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Name         | Display name, linking to `/[lang]/dashboard?perspective=<slug>` when the person has a slug                                                                  | yes (lastName, firstName) |
| Arrival      | membership/employment `startDate`, locale-formatted, `—` when null                                                                                          | yes (nulls last)          |
| Departure    | `endDate`, same formatting                                                                                                                                  | yes (nulls last)          |
| Publications | count over the directory KPI window, linking to `/[lang]/documents?perspective=<slug>` (the `perspective` query param is resolved globally by `MainLayout`) | yes                       |
| HAL          | `RateBar`, same computation as the structure KPIs but for the single person                                                                                 | yes                       |
| OA           | `RateBar`, idem                                                                                                                                             | yes                       |
| Identifiers  | icon links via `PersonIdentifier.getIcon()`/`getUrl()` — orcid, idref, idhals/idhali                                                                        | no                        |

### Backend

- **API**: `GET /api/organizations/[uid]/members?page&pageSize&present&search&sortBy&sortDesc`
  → `{ members: StructureMemberJson[], total }`. No auth check, consistent with
  `/api/organizations/directory`.
- **Service**: `OrganizationUnitService.getStructureMembers(...)` — resolves the structure's
  category, picks the employment/membership source, applies the present filter and the
  (case/diacritics-insensitive) name search, computes per-person publications/OA/HAL KPIs by
  reusing `DocumentDAO.fetchDocumentStatsSince` over the same 24-month window as the
  directory, sorts, then paginates in memory (member sets are at most a few thousand rows).
- **DAO**: `PersonDAO.fetchStructureMembers(orgUid, kind)` — the only Prisma access; maps to a
  new `StructureMember` domain class (`src/app/types/StructureMember.ts`) carrying person
  fields, link dates (ISO strings), identifiers and KPI slots.
- **Store**: `organizationUnitSlice` gains `members` state + `fetchStructureMembers` action;
  the table component drives pagination/sorting state and re-fetches through the store.

### Decisions (confirmed)

1. Direct members only for non-institutions (no perimeter aggregation).
2. Server-side pagination/sorting/search.
3. Present switch defaults ON; null `endDate` counts as present.
4. Employments apply to the `institution` category only; `institution_subdivision` and the
   rest list memberships.

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
