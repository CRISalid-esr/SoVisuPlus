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
- Validating a profile also validates its existing IdRef, ORCID and idHAL
  identifiers (`VALIDATABLE_IDENTIFIER_TYPES`) that are neither validated nor
  authenticated. Authenticated identifiers are already validated, so no message
  is sent for them (the IKG never clears `authenticated` anyway).
- The profile flag itself is local: it is not sent to the graph. Each newly
  validated identifier emits the same message as the identifier validation of
  [`979`](../979-add-validation-button-in-account-page-for-account-editor-user/prompt.md):
  `UPDATE` on `task.people.person.update` with
  `{ identifier: { type, value, authenticated: false } }`.
- The profile flag, the identifier flags and the actions are written in one
  transaction (`PersonDAO.markPersonValidated`); nothing changes when the
  profile already was validated.

## Persistence

- New columns on `Person`:
  `validated Boolean @default(false)`,
  `validatedAt DateTime?` (date of the validation) and
  `validatedBy String?` (uid of the validator's `Person`, taken from `session.user.authz.personUid`; null when the
  validator has none). `validatedBy` is a plain uid, not a relation, so it is
  kept if the validator's person is removed. The three fields are written once,
  in the validation transaction, and are not exposed to the client.
- Graph syncs (`PersonDAO.createOrUpdatePerson`) never write these columns, so
  the validation survives them.
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
- Sending the profile validation itself to the graph.
