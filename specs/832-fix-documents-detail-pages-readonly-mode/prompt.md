# Fix documents detail pages read-only mode

## Context

Follows up on branch `829-document-waiting-for-update-shouldnt-be-editable`, which froze
the editable tabs while a document is `waiting_for_update`. That work used CASL `<Can
passThrough>` with `disabled={!allowed}`, which left edit controls **rendered but
disabled** for users without edit permission.

Read-only users (no edit permission) must not see edit controls **at all** — restoring
the prior behaviour. Two distinct states must be kept separate:

- **No edit permission (read-only)** → hide the control entirely.
- **Has edit permission but document frozen** (`waiting_for_update`) → show the control,
  disabled (the page-level frozen notice explains why).

---

## Issue 1 — Hide in-place edit controls for read-only users

In **BibliographicInformation**, drop `passThrough` from the `<Can>` wrappers (and the
`(allowed) => …` render-prop) so the edit button only renders when the user has the
relevant `update` permission. Express the frozen state purely as
`disabled={selectedDocument?.isFrozen}`.

- `Titles.tsx` — field `titles`.
- `Abstracts.tsx` — field `abstracts`.
- `Type.tsx` — field `documentType`.

Result: read-only users see no edit button; permitted users see it, disabled only while
frozen.

The other tabs already behave correctly for read-only users (Keywords hides its
vocabulary section and makes chips non-removable when not allowed; Sources hides row
checkboxes when the user lacks `unmerge`), so no change is needed there.

---

## Issue 2 — Navigation buttons (modify contributors / compare sources)

The `BibliographicInformation` rows for authors and sources expose buttons that only
**navigate** to the Authors / Sources tabs.

- **'modify contributors'** (`BibliographicInformation/Authors.tsx`) — gate on
  `update` / field `contributors` (drop `passThrough`, hide for read-only). The button is
  navigation only, so it stays **available even when the document is frozen** (no
  `disabled` on frozen state).
- **'compare sources'** (`BibliographicInformation/Sources.tsx`) — previously always
  shown. Make it visible to **editors** only — anyone who can `update` the document
  (field-less `ability.can(PermissionAction.update, selectedDocument)`). It must stay
  visible and clickable **whatever the document state** (including `waiting_for_update`).
  Do **not** gate it on `unmerge`: editors hold `update` (role `document_editor`), not
  necessarily `unmerge` (role `document_merger`), so an `unmerge` gate wrongly hid it.

---

## Issue 3 — "Select all" checkboxes

### Sources table (`[uid]/hooks/useSourcesTable.tsx`)

Disable the toolbar "select all" checkbox when no row is selectable — i.e. the document
is frozen **or** the user can't `unmerge` any of its records:

```ts
const hasSelectableRow =
  !isFrozen &&
  data.some((record) => ability.can(PermissionAction.unmerge, record))
// ...
muiSelectAllCheckboxProps: { disabled: !hasSelectableRow },
```

(`unmerge` is granted per `DocumentRecord`.)

### Publications list table (`documents/hooks/usePublicationsTable.tsx`)

Disable the toolbar "select all" checkbox for users without `merge` permission — i.e. no
listed document in `default` state that the user can `merge`:

```ts
const hasSelectableRow = documents.some(
  (doc) =>
    isDocument(doc) &&
    ability.can(PermissionAction.merge, doc) &&
    doc.state === DocumentState.default,
)
// ...
muiSelectAllCheckboxProps: { disabled: !hasSelectableRow },
```

Both checks mirror the existing per-row `enableRowSelection` logic. Remember to add the
derived flag to the `useMemo` dependency array of the table options.
