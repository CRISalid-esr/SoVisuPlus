# No self-deletion of IdRef for a researcher

## Intent

The backends (ikg, harvester) do not correctly handle an IdRef being re-assigned to a
person after it has been removed. Until that bug is fixed, researchers must not be able
to remove their own IdRef from the account page.

This is a **temporary** restriction.

## Scope

- Users whose `account_editor` role is **only** scoped to their own `Person` (the default
  self-scoped grant) can no longer remove an IdRef: the "Remove" button is hidden in
  `IdrefControl` and `DELETE /api/person/[uid]/identifiers/idref` returns 403.
- Editors holding `update Person.identifiers` through a wider scope (ResearchUnit,
  Institution, another Person, or global) keep the ability, on any account they manage,
  including their own.
- Unchanged: adding an IdRef (already wide-scope only) and every other identifier type.

## Design

The rule lives in the shared capability matrix
(`src/app/lib/identifiers/identifierCapabilities.ts`), used by both the API route and the
`useIdentifierCapabilities` hook:

- `identifierRemovalRequiresWideScope(type)` returns `true` for IdRef.
- `computeIdentifierCapabilities` takes a `removalRequiresWide` flag; when set,
  `canRemove = canManage && isWide`.

## Rollback

Once the backend bug is fixed, make `identifierRemovalRequiresWideScope` return `false`
(or remove it with the `removalRequiresWide` input) and restore the related tests.
