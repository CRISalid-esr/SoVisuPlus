# Validate identifiers from the account page

## Goal

A **wide-scoped `account_editor`** (permission held through a scope wider than
their own `Person`) can mark an existing, non-authenticated identifier (IdRef,
ORCID, IdHAL) of any account in their perimeter — including their own — as
**validated**, without authenticating it. The change is broadcast to the graph.

Builds on the account-edition model of
[`872-refactor-account-edition-workflow`](../872-refactor-account-edition-workflow/prompt.md).

## Rules

- **Authenticated ⇒ validated.** `authenticated` stays derived locally (ORCID
  OAuth grant, idHAL `hal_login` companion); an authenticated identifier is
  always considered validated and never offers the Validate action.
- `canValidate = canManage && isWide && exists && !isValidated`
  (`canValidateIdentifier`, `src/app/lib/identifiers/identifierCapabilities.ts`),
  shared by the UI hook and the API route.
- Validation never changes the value and cannot be undone (the graph has no
  "unvalidate" operation).
- A **manual add** (add without authenticating, wide-scoped editors) is made by a
  privileged user: it is stored as validated, as the IKG already does.
- Value changes remain remove + add; a recreated row starts non-validated unless
  manually added.

## Persistence and sync

- New column `PersonIdentifier.validated Boolean @default(false)`.
- The graph (IKG) is the source of truth: Apollo exposes `validated` on
  `AgentIdentifier` (crisalid-apollo), queried in `person.graphql` and
  `document.graphql` (contributors) and stored by
  `PersonDAO.upsertIdentifiers` during person sync.
- Sync rule: every graph sync (person message and document contributors, both
  query `validated`) takes the flag from the graph, so a validation the IKG
  rejected is cleared by the next sync of that person. A sync arriving between
  the click and the IKG's processing briefly clears the local validation; the
  IKG's own person update restores it.
- Existing data: `npm run sync:identifiers-validation` aligns the flag with the
  graph once after deployment (identifiers validated in the IKG before the
  column existed).

## Outgoing message

| Event                | Action type | Routing key                 | `parameters`                                            |
| -------------------- | ----------- | --------------------------- | ------------------------------------------------------- |
| Validate (unchanged) | `UPDATE`    | `task.people.person.update` | `{ identifier: { type, value, authenticated: false } }` |

The action is recorded in the same transaction as the local `validated` flag.
The IKG handles it in `confirm_identifier`, which sets `validated = true`.
No IKG change is needed.

## API

`PATCH /api/person/[uid]/identifiers/[type]` with body `{ validated: true }`:
400 invalid body, 404 person or identifier missing, 403 not a wide-scoped editor
of this person, 409 already validated or authenticated, 200 on success.

## UI

- `ValidateIdentifierButton` (button + confirmation dialog + snackbar) next to the
  identifier in `IdrefControl`, `OrcidControl`, `HalControl`, when `canValidate`.
- `ValidatedBadge` next to the control title for validated, non-authenticated
  identifiers — visible to every viewer (authenticated ones keep their link icon).

## Deployment order

crisalid-apollo must expose `AgentIdentifier.validated` **before** this version of
SoVisuPlus is deployed: the person and document queries request the field, so
both person and document syncs would fail without it.
