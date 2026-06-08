# Remove tab token when exiting document details

## Context

The document **details** page (`src/app/[lang]/documents/[uid]/page.tsx`) keeps its active
tab in a `tab` URL query param. Its values are detail-specific:
`bibliographic_information`, `keywords`, `domains`, `sources`, `authors`, `update_in_hal`,
`add_in_hal`.

The **documents list** page (`src/app/[lang]/documents/page.tsx`) reuses the _same_ `tab`
param for its own filter, but with a different, incompatible value set:
`all_documents`, `incomplete_hal_repository`. It reads the param without validation
(`setSelectedTab(tab ?? 'all_documents')`).

When the user leaves the details page while a detail-only `tab` value is in the URL and
lands on the list page, the list's `TabFilter` (MUI `Tabs`) receives a `value` that
matches none of its tabs. This produces a runtime error and a broken UI state:

- `MUI: The `value` provided to the Tabs component is invalid. None of the Tabs'
children match with "authors". You can provide one of the following values:
all_documents, incomplete_hal_repository.` (logged repeatedly on every render)
- No tab is highlighted — the list renders with no active filter indicator.

Three exit paths already clear the param with `params.delete('tab')`:

- The **back button** — `documents/[uid]/components/DocumentDetailsHeader.tsx`
- The **perspective switch** — `components/SearchInput/SearchInput.tsx`
- The **author chip** navigation — `documents/[uid]/components/BibliographicInformation/Authors.tsx`

The remaining uncovered exit path is the **Sidebar**.

---

## Issue — Sidebar leaks the `tab` param off the details page

`src/app/[lang]/components/Sidebar/Sidebar.tsx` builds every nav link by forwarding the
full current query string (`?${searchParams.toString()}`) to the destination
(dashboard, documents, expertise, groups, institutions, laboratories). So navigating away
from `/[lang]/documents/<uid>?tab=authors` via the sidebar carries `tab=authors` onto the
destination — breaking the list page's `TabFilter`.

### Fix

Strip the `tab` param from sidebar nav links **only when the user is currently on a
document details page**, so the leak is removed without disturbing the list page's own
tab.

- Add a memoized `navSearchParams` that copies `searchParams` and deletes `tab` when
  `pathname.startsWith(`/${lang}/documents/`)` (the details route — note the trailing
  slash, which excludes the list route `/[lang]/documents`).
- Use `navSearchParams` instead of `searchParams.toString()` in all six sidebar nav
  `href`s.

This completes the existing "delete `tab` on exit" pattern already used by the other
three exit paths.

---

## Constraints

- Do **not** strip `tab` indiscriminately: on the list page (`/[lang]/documents`) the
  `tab` param is a valid filter (`all_documents` / `incomplete_hal_repository`) and must
  be preserved when navigating via the sidebar. The trailing-slash path check guarantees
  this.

---

## Verification

Verified end-to-end against the running app (HTTPS dev server + Keycloak login, driven
with Playwright):

- From `/en/documents/<uid>?tab=authors`, the sidebar "Documents" link is
  `/en/documents?` (no `tab`); clicking it lands on `/en/documents` with **no** `tab`
  param and **0** MUI Tabs errors; the list shows its default tab correctly selected.
- Control: loading `/en/documents?tab=authors` directly reproduces the bug — no tab
  selected and the MUI invalid-value error logged repeatedly.
- Non-regression: from `/en/documents?tab=incomplete_hal_repository`, the sidebar link
  preserves `tab=incomplete_hal_repository`.
