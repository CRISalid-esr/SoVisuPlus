# Document waiting-for-update shouldn't be editable

## Context

When a `Document` has its `state` set to `waiting_for_update` (see `prisma/schema.prisma`,
enum `DocumentState`), it is pending a change being applied by the Neo4j graph and must
not be editable. This freeze is durable: it lives on `Document.state` (set on save, reset
to `default` once the graph re-writes the document), so it survives navigating away and
back — a re-fetch of a still-pending document returns `waiting_for_update`.

Before this change, only two surfaces honoured the frozen state:

- The **merge** action (document list) — disabled for `waiting_for_update` rows.
- The **Authors** tab — frozen via `useContributionsEditor`'s `isFrozen` flag.

The **BibliographicInformation**, **Keywords** and **Sources** tabs still exposed their
editable controls. These — and any further tabs (**Domains**, **HAL**) — must also be
frozen.

---

## Issue 1 — Centralize the frozen concept

Add a reusable `get isFrozen()` getter to the `Document` domain class
(`src/app/types/Document.ts`), returning `state === DocumentState.waiting_for_update`.

Refactor `useContributionsEditor.ts` (Authors tab) to consume `document?.isFrozen`
instead of its inline state comparison, so every tab shares one source of truth. Remove
the now-unused `DocumentState` import there.

---

## Issue 2 — Freeze the editable tabs

A frozen document must be read-only regardless of the user's edit permission. Where a
tab already gates controls on a CASL `allowed` flag, fold the freeze in
(`editable = allowed && !isFrozen`); where it gates on a permission `ability.can(...)`,
combine with `!isFrozen`.

### BibliographicInformation

All in-place edit controls must be disabled when frozen:

- **Titles** (`BibliographicInformation/Titles.tsx`) — edit button `disabled` when frozen.
- **Abstracts** (`BibliographicInformation/Abstracts.tsx`) — edit button `disabled` when frozen.
- **Type** (`BibliographicInformation/Type.tsx`) — edit button `disabled` when frozen.
- Date / Journal / Identifiers have no in-place edit control today; the same pattern
  applies to any future Date edit control.

### Keywords

Must drop to read-only mode, identical to lacking edit permission
(`Keywords/Keywords.tsx`):

- Vocabulary selection checkboxes and the keyword search autocomplete are hidden.
- Keyword chips are not removable.

### Sources

In `hooks/useSourcesTable.tsx`:

- Row checkboxes not selectable (`enableRowSelection` returns `false` when frozen).
- Toolbar "select all" checkbox disabled when frozen
  (`muiSelectAllCheckboxProps: { disabled: isFrozen }`).
- Actions select options not triggerable (`MenuItem` `disabled` when frozen).

---

## Issue 3 — Frozen notice on all tabs

Show an informational `Alert` whenever the open document is frozen, on **every** tab
(BibliographicInformation, Keywords, Domains, Sources, Authors, and the HAL tabs).

- Render it once at the page level (`[uid]/page.tsx`), above the rendered tab content,
  rather than duplicating it per tab.
- Remove the Authors-tab-local frozen `Alert` (now redundant) and its now-unused
  `documents_details_page_authors_tab_frozen_notice` translation key.
- New translation key `document_details_page_frozen_notice`:
  - EN: "This document is waiting to be updated from the graph and cannot be edited right now."
  - FR: "Ce document est en attente de mise à jour depuis le graphe et ne peut pas être modifié pour le moment."

### Gating

The notice is shown to **editors only** — users who can update the document
(`ability.can(PermissionAction.update, selectedDocument)`, field-less check). Read-only
viewers never have controls to freeze, so the message would be irrelevant noise to them.

---

## i18n

After editing strings, run `npm run i18n:extract` (registers the new key, retires the old
one), fill in the EN/FR `msgstr`, then `npm run i18n:compile`. Never edit `.po` entries
by hand outside of filling extracted `msgstr`, and never edit the generated `.js`
catalogs.
