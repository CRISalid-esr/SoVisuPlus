# Validate a profile from the account page

## Goal

A **wide-scoped `account_editor`** (permission held through a scope wider than
their own `Person`, see `hasWiderThanSelfPersonScope`) can mark a profile of
their perimeter — including their own — as **validated**, to signal it has been
reviewed, even when identifiers are missing.

## Rules

- `canSeeProfileValidation = canManage && isWide` and
  `canValidateProfile = canSeeProfileValidation && !isValidated`
  (`src/app/lib/identifiers/identifierCapabilities.ts`), shared by the UI hook
  and the API route. `canManage` is `ability.can(update, person, 'identifiers')`.
- Validation cannot be undone (for now).
- Validating a profile does **not** validate its identifiers (under discussion).
- Local only: no `Action`, nothing is sent to the graph.

## Persistence

- New column `Person.validated Boolean @default(false)`.
- Graph syncs (`PersonDAO.createOrUpdatePerson`) never write the column, so the
  validation survives them.
- `Person.fromDbPerson` hydrates `validated` only with `{ withValidation: true }`:
  account reads (`fetchPersonByUid`, `fetchPersonBySlug`, the connected user).
  Other reads (people search, document contributors) always report `false`.

## API

`PATCH /api/person/[uid]/validation` with body `{ validated: true }`:
400 invalid body, 404 person missing, 403 not a wide-scoped editor of this
person, 409 already validated, 200 on success.

Visibility is enforced server side: `GET /api/person/slug/[slug]` and
`GET /api/users/me` force `validated: false` for viewers who may not see it;
`StructureMember.toJson` exposes `profileValidated` only when
`canSeeProfileValidation` (set by `OrganizationUnitService.markEditableAccounts`).

## UI

- Account page: `ValidateProfileButton` (button + confirmation dialog +
  snackbar) next to the page title when `canValidate`; `ProfileValidatedBadge`
  when the status is visible and validated.
- Structure members table: `ProfileValidatedBadge` next to the member's name.

## Out of scope

- Undoing a validation.
- Sending the validation to the graph.
- Validating the identifiers along with the profile.
