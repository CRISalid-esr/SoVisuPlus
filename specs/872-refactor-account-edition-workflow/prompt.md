# Refactor the account edition workflow

GitHub issue: [CRISalid-esr/SoVisuPlus#872](https://github.com/CRISalid-esr/SoVisuPlus/issues/872)

## Goal

Rework how external identifiers (IdRef, ORCID, IdHAL) are managed on the
**Account** page so that:

1. a **wide-scoped `account_editor`** can edit a non-authenticated ORCID or
   IdHAL directly — without going through authentication — exactly as they can
   already do for IdRef;
2. an existing identifier can never be **replaced in place** — it must be
   **removed first**, then a new one added;
3. **authentication** of an existing identifier only ever confirms its value; if
   the identity provider returns a different value the operation fails;
4. every identifier change is reflected in the **outgoing messages** as a clean
   **addition / deletion / update**, and authenticated identifiers are marked as
   such on the wire.

The unifying idea is a single, explicit **action model** — `Add`,
`Remove`, `Authenticate` — replacing today's ad-hoc, per-type, upsert-based
handling.

---

## Background — current behaviour (to be replaced)

### Three heterogeneous identifier controls

`src/app/[lang]/account/components/myProfile/components/identifiers/`

| Type  | Control            | How it changes today                                                                                   |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| IdRef | `IdrefControl.tsx` | Inline **edit form** (TextField + verify + save) → `PUT`/`DELETE /api/person/[uid]/identifiers/[type]` |
| ORCID | `OrcidControl.tsx` | **OAuth only** (`OrcidLoginButton` → `/api/orcid/callback`). No manual value entry.                    |
| IdHAL | `HalControl.tsx`   | **CAS only** (`HalLoginButton` → `/api/cas/login`). No manual value entry.                             |

Each control derives its own notion of "linked / authenticated":

- **IdRef** — no linked concept; presence only.
- **ORCID** — `isLinked = Boolean(orcidIdentifier?.oauth)` (an `OrcidIdentifier`
  OAuth-token row exists) — `OrcidControl.tsx`.
- **IdHAL** — `isLinked = hasHalIdentifier && hasHalLogin` (a companion
  `hal_login` identifier exists) — `HalControl.tsx`.

There is **no stored `authenticated` flag** anywhere — not on the
`PersonIdentifier` model, the domain type, the GraphQL query, or any message
payload. "Authenticated" is inferred structurally, differently per type.

### Asymmetric permission gates

`account_editor` grants a single CASL rule: `update` on `Person`, field
`identifiers` (`rbac.roles.yaml`). Self-scoped vs wide-scoped is decided by the
**scope on the assignment**, via `hasWiderThanSelfPersonScope()`
(`src/app/auth/ability.ts:78-101`) — true when the permission comes through a
scope broader than the user's own `Person:<own uid>` (global, ResearchUnit,
Institution, or a **different** Person).

Current gating is inconsistent:

- **IdRef edit/remove** (`IdrefControl.tsx`, `PUT`/`DELETE` route) requires
  `hasWiderThanSelfPersonScope(...) && ability.can(update, person, 'identifiers')`
  → **wide-scoped only**; a self-scoped editor cannot even touch their own IdRef.
- **ORCID / IdHAL authentication** (`OrcidControl.tsx`, `HalControl.tsx`, and the
  callbacks) requires `ownPerspective && ability.can(update, connectedUser.person,
'identifiers')` → **own account only**, self-service.

### Callbacks overwrite unconditionally

Neither `/api/orcid/callback` nor `/api/cas/[action]` compares the value returned
by the IdP against the value already stored. `PersonDAO.upsertIdentifier` does
`update: { value }` on the `(personId, type)` unique key, so a re-authentication
returning a **different** ORCID/idHAL silently replaces the stored one.

### Per-identifier outgoing messages, no `authenticated` marker

- `PersonService.addOrUpdateIdentifier` / `addOrUpdateOrcidIdentifier` both write
  an **`ActionType.ADD`** row (add and update are indistinguishable); there is no
  identifier `UPDATE`.
- `removeIdentifier` writes an **`ActionType.REMOVE`** row (`parameters: { type }`).
- `ActionDispatchService` publishes each on routing key
  `task.people.person.{add|remove}` with payload
  `parameters: { identifier: { type, value } }` (add) — **no `authenticated`
  field**. `ORCIDIdentifier` does **not** override `toJson()`, so OAuth/scope data
  never reaches the message.

### The account page has no `[uid]` route param

Whose account is shown is driven entirely by client state
(`userSlice`: `connectedUser`, `currentPerspective`, `ownPerspective`), keyed off
`?perspective=<slug>`. `ownPerspective === (connectedUser.person.uid ===
currentPerspective.uid)`. Identifier writes go through the store actions
`updatePersonIdentifier` / `removePersonIdentifier`.

---

## Target behaviour

### 1. Action / permission matrix

Reproduced from the issue (authoritative):

| Actor                                             | No identifier                                           | Non-authenticated identifier            | Authenticated identifier |
| ------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- | ------------------------ |
| Any other user                                    | No action                                               | No action                               | No action                |
| Self-scoped `account_editor`, **own** account     | Add through authentication                              | Remove · Authenticate (value unchanged) | Remove                   |
| Wide-scoped `account_editor`, **own** account     | Add without authenticating · Add through authentication | Remove · Authenticate (value unchanged) | Remove                   |
| Wide-scoped `account_editor`, **another** account | Add without authenticating                              | Remove                                  | No action                |

“Any other user” = a user with no `account_editor` permission, **or** a
self-scoped `account_editor` viewing someone else's account.

Translating the matrix into the four primitive capabilities (`canManage =
ability.can(update, targetPerson, 'identifiers')`, which already encodes the
scope perimeter):

| Capability                             | Gate                                            |
| -------------------------------------- | ----------------------------------------------- | --- | ---------------------------------- |
| **Authenticate** (own value)           | `ownPerspective && canManage`                   |
| **Add through authentication** (empty) | `ownPerspective && canManage`                   |
| **Add without authenticating**         | `hasWiderThanSelfPersonScope(...) && canManage` |
| **Remove non-authenticated**           | `canManage && (ownPerspective                   |     | hasWiderThanSelfPersonScope(...))` |
| **Remove authenticated**               | `ownPerspective && canManage`                   |

Key rules (from the issue):

- An `account_editor` (self- or wide-scoped) can **authenticate** an identifier
  **only on their own account**.
- A **wide-scoped** `account_editor` can **add/edit** a non-authenticated IdRef,
  ORCID, or IdHAL **without authenticating** it, on their own or another account.
- An **authenticated** identifier can only be **removed** — and only on the
  owner's own account. It can never be edited directly, nor removed by a wide
  editor on someone else's account.
- **Consequence to note:** because IdRef has no authentication workflow, a
  **self-scoped** editor can now _remove_ their own (always non-authenticated)
  IdRef but still **cannot add one** (adding IdRef requires wide scope). This is
  intended and is a change from today (today self-scoped cannot remove it either).

### 2. The "non-authenticated" vs "authenticated" distinction

- **IdRef** is always **non-authenticated** — there is no IdRef authentication
  workflow.
- **ORCID** is **authenticated** iff it carries an OAuth grant
  (`ORCIDIdentifier.oauth` / the `OrcidIdentifier` row).
- **IdHAL** (`idhals`/`idhali`) is **authenticated** iff a companion `hal_login`
  identifier is present.

**Decision: `authenticated` is deduced, never persisted as its own column.**
The three structural signals below are already stored and are mutually exhaustive,
so no schema change is needed. `authenticated` is a **derived** property:

| Type                      | `authenticated` ⟺                                                       | Signal already persisted by |
| ------------------------- | ----------------------------------------------------------------------- | --------------------------- |
| ORCID                     | an OAuth grant exists (`ORCIDIdentifier.oauth` / `OrcidIdentifier` row) | `/api/orcid/callback`       |
| IdHAL (`idhals`/`idhali`) | a companion `hal_login` identifier exists                               | `/api/cas/[action]`         |
| IdRef                     | never — always `false`                                                  | —                           |

Concretely:

- the **UI** keeps deriving authenticated state from these signals (it already
  does today: `Boolean(oauth)` for ORCID, `hasHalLogin` for IdHAL, `false` for
  IdRef);
- the **outgoing message** carries an explicit `authenticated` boolean that
  `PersonService` **stamps at action-creation time** from the operation it just
  performed (manual add → `false`, authentication → `true`; see §5) — it does not
  re-derive at dispatch time;
- a single derivation helper (e.g. `PersonIdentifier.isAuthenticated(person)` or
  equivalent) should be the one source of truth shared by UI and server so the
  three signals are never re-implemented ad hoc.

> If the graph/IKG middleware later needs a first-class stored `authenticated`
> field (not just on the wire), it can be added as `authenticated Boolean
@default(false)` on `PersonIdentifier` with a backfill migration — but that is
> **out of scope** here; derive-and-stamp is the chosen approach.

### 3. No in-place replacement — remove before add

Value changes must **never** overwrite an existing identifier in place. The
current IdRef inline "Edit" (which upserts a new value onto the same row) is
removed. To change a value the user must **Remove**, then **Add** — surfaced in
the UI as two distinct steps.

Enforced at every layer:

- **UI** — the identifier controls no longer offer an in-place edit affordance
  when an identifier already exists; they offer **Remove** (and, when empty, an
  **Add** path appropriate to the actor's capabilities).
- **API (`PUT`/add route)** — reject an add when an identifier of that type
  already exists on the person, with an error instructing the caller to remove
  the existing one first (HTTP 409).
- **DAO** — the add path **creates only**; it must not fall back to updating the
  value of an existing row for user-driven changes.

### 4. Authentication consistency

When a user **authenticates an existing non-authenticated identifier**, the value
returned by the authentication workflow must equal the value already stored:

- **equal** → mark the identifier authenticated, keeping the value unchanged
  (emit an `UPDATE` — see §5);
- **different** → the operation **fails** with an error explaining that the
  existing identifier must first be **removed** before a different one can be
  authenticated. Nothing is written.

This applies to both callbacks:

- `/api/orcid/callback` — compare the returned `orcid` against the stored ORCID
  value before persisting.
- `/api/cas/[action]` — compare the AureHAL-resolved `idHal_s`/`idHal_i` against
  the stored idHAL value before persisting.

When **no** identifier of that type exists yet, authentication is an **add
through authentication** (emit `ADD`, authenticated).

Re-authenticating an **already-authenticated** identifier with the **same** value
is allowed (e.g. token refresh); with a **different** value it fails the same way
(authenticated identifiers cannot be edited directly).

### 5. Outgoing messages

Represent every identifier change as an **addition, deletion, or update**:

| Event                                   | Action type | Routing key                 | `parameters`                                            |
| --------------------------------------- | ----------- | --------------------------- | ------------------------------------------------------- |
| Add without authenticating              | `ADD`       | `task.people.person.add`    | `{ identifier: { type, value, authenticated: false } }` |
| Add through authentication (was empty)  | `ADD`       | `task.people.person.add`    | `{ identifier: { type, value, authenticated: true } }`  |
| Authenticate existing (value unchanged) | `UPDATE`    | `task.people.person.update` | `{ identifier: { type, value, authenticated: true } }`  |
| Remove                                  | `REMOVE`    | `task.people.person.remove` | `{ type, value }`                                       |

Rules (from the issue):

- A message **must** be emitted on delete (already the case; keep it).
- An **`UPDATE`** is emitted **only** when an existing identifier is successfully
  **authenticated without changing its value**. Every **value change** is a
  **remove + add** — two messages, never an update.
- When an **ORCID or IdHAL** identifier is successfully authenticated, the message
  must carry **`authenticated: true`**.

`ActionDispatchService.buildRoutingKey` already maps a `PERSON` action to
`task.people.person.${action.toLowerCase()}`, so introducing `ActionType.UPDATE`
for identifiers yields `task.people.person.update` with no dispatcher change.

**The `hal_login` companion is internal to the account-edition model.** HAL
authentication writes `hal_login` **plus** `idhals`/`idhali`. `hal_login` is:

- **kept persisted** — its _value_ is functionally required elsewhere: the HAL
  deposit on-behalf-of header is `login|<hal_login>;idhal|<idhal>`
  (`HalOnBehalfOfBuilder`), and `validateDepositEligibility` requires it. It must
  not be discarded;
- **not a user-managed identifier** — it has no control of its own
  (`identifierComponentMap[hal_login] = null`) and is **never emitted as its own**
  `add`/`remove`/`update` identifier message. Today's `ADD` message for the
  `hal_login` write must be **suppressed**;
- **the authenticated marker** — its presence is exactly what makes the idHAL
  authenticated (§2);
- **cascade-removed** — removing the idHAL (`idhals`/`idhali`) must also delete the
  person's `hal_login` row, so the idHAL cannot be left half-authenticated.

---

## Required changes by layer

### Domain types — `src/app/types/`

- `PersonIdentifier.toJson()` (and `PersonIdentifierJson`) — carry an
  `authenticated` boolean so it can flow into message parameters. `ORCIDIdentifier`
  must not drop it (it currently doesn't override `toJson()`).
- Add an `ActionType.UPDATE` usage for the identifier path if not already
  expressible (see `src/app/types/Action.ts` / `ActionType`).

### Permissions — `src/app/auth/ability.ts` (+ `rbac.roles.yaml` only if needed)

- No new permission action or subject is required — the matrix is expressible with
  the existing `update`/`Person`/`identifiers` rule plus `ownPerspective` and
  `hasWiderThanSelfPersonScope`. Introduce small, well-named helpers for the five
  capabilities in §1 so the UI and API share one source of truth.

### API routes — `src/app/api/`

- **`person/[uid]/identifiers/[type]/route.ts`**
  - Extend `ALLOWED_TYPES` to accept **`orcid`**, **`idhals`**, **`idhali`** so
    wide editors can add them without authenticating. Validation is keyed by
    `[type]` (each type already gets its own regex):

    ```ts
    const ALLOWED_TYPES: Partial<Record<PersonIdentifierType, RegExp>> = {
      [PersonIdentifierType.idref]: /^\d{8}[\dX]$/i,
      [PersonIdentifierType.orcid]: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i, // after ORCIDIdentifier.normalize() strips any URL prefix
      [PersonIdentifierType.idhals]: /^[a-z0-9-]+$/i, // string form — a-z, 0-9, hyphen
      [PersonIdentifierType.idhali]: /^\d+$/, // numeric internal id
    }
    ```

  - `PUT` becomes **add-only**: 409 if an identifier of that type already exists
    (remove-before-add). Set the added identifier **non-authenticated**.
  - `DELETE`: relax the gate from "wide only" to **remove non-authenticated**
    (`canManage && (ownPerspective || hasWiderThanSelfPersonScope)`) and **remove
    authenticated** (`ownPerspective && canManage`) per the matrix.

  ORCID values are **`normalize()`d before validation** (strip any
  `https://orcid.org/` prefix, as `ORCIDIdentifier.normalize()` does) so the stored
  value matches what the OAuth path persists.

  **`idhals` vs `idhali` on the manual-add path.** They are two distinct
  `PersonIdentifierType`s, so the route validates each with its own regex. The UI's
  single IdHAL control carries an explicit **`idHal_s` / `idHal_i` switcher** at the
  end of the input line (see UI section); the selected variant determines the
  `[type]` submitted (`idhals` or `idhali`) and therefore which regex applies. No
  format inference. (During CAS authentication there is no switcher — AureHAL
  dictates the type: `idHal_s` present → `idhals`, else `idhali`, as the callback
  already does.)

- **`orcid/callback/route.ts`** and **`cas/[action]/route.ts`**
  - Add the **value-consistency check** (§4): compare IdP-returned value to the
    stored value; add-through-auth when empty, authenticate-in-place when equal,
    **fail** when different.
  - On success, ensure the resulting action is stamped **authenticated** and uses
    `ADD` (empty) or `UPDATE` (in-place authenticate) accordingly.

### Services — `src/app/lib/services/PersonService.ts`

- Split the current `addOrUpdateIdentifier` / `addOrUpdateOrcidIdentifier` into
  explicit operations, each writing the correct action:
  - **add (non-authenticated)** → `ADD`, `authenticated: false`;
  - **add through authentication** → `ADD`, `authenticated: true`;
  - **authenticate existing** (value unchanged) → `UPDATE`, `authenticated: true`;
  - **remove** → `REMOVE` (keep, optionally add `value` to parameters).
- Enforce **remove-before-add** server-side (reject add when a row of that type
  exists).

### DAO — `src/app/lib/daos/PersonDAO.ts`

- Provide a **create-only** add path (no silent value overwrite for user-driven
  changes). Keep `upsertOrcidIdentifierExtension` for the OAuth-token row written
  during authentication.
- `deleteIdentifier` — removing an authenticated **ORCID** must also remove its
  `OrcidIdentifier` OAuth-token row; removing an **idHAL** (`idhals`/`idhali`) must
  also remove the person's `hal_login` row (§5). Neither cascade emits a `hal_login`
  message.

### UI — identifier controls

- **Normalise the three controls** onto the shared capability model (§1). Each
  control shows exactly the actions the current actor is entitled to for the
  current identifier state: `Add without authenticating` / `Add through
authentication` / `Authenticate` / `Remove` / nothing.
- **ORCID & IdHAL** gain a **manual add form** (value entry, validated, like
  IdRef's) available to **wide-scoped** editors for the non-authenticated path.
  The **IdHAL** manual form carries an explicit **`idHal_s` / `idHal_i` switcher**
  at the end of the input line; the chosen variant drives both the client-side
  validation regex and the `[type]` (`idhals`/`idhali`) sent to the route — no
  format inference. The ORCID manual form has no switcher (single type).
- Remove the in-place **Edit** affordance; replace value change with
  **Remove → Add**.
- Surface the **authentication-mismatch** error (§4) to the user.
- **Cleanup:** delete the dead file `OrciLoginButton.tsx` (misspelled duplicate,
  imported nowhere; the live one is `OrcidLoginButton.tsx`).

### Store — `src/app/stores/userSlice.ts`

- Adjust `updatePersonIdentifier` to the add-only semantics (or rename to
  `addPersonIdentifier`), keep `removePersonIdentifier`, and refresh the
  perspective after each change (already done).

---

## Constraints & edge cases

- **Own-account detection** relies on `ownPerspective`; there is no `[uid]` on the
  account page. "Authenticate" and "add/remove authenticated" must be gated on
  `ownPerspective`, not merely on `canManage`.
- **Authenticated identifiers are immutable in value.** The only operations are
  authenticate-refresh (same value) and remove (own account).
- **IdRef never becomes authenticated.** It only ever participates in the
  non-authenticated column.
- **Uniqueness** stays per `(person, type)`; the add path must therefore reject a
  second identifier of the same type (409) rather than upsert.
- Existing **i18n** workflow applies — new user-facing strings via
  `npm run i18n:extract`, then translate and `npm run i18n:compile`. Never edit
  `.po`/`.js` catalogs by hand.

## Resolved design decisions

- **`authenticated` is derived, not stored** — deduced from the OAuth grant
  (ORCID), the `hal_login` companion (IdHAL), or `false` (IdRef), and stamped into
  the outgoing message from the operation performed. No schema change (§2).
- **`hal_login` is internal** — kept persisted (deposits use its value) but never
  emitted as its own identifier message; it is the idHAL authenticated marker and
  is cascade-removed with the idHAL (§5).
- **`idhals` / `idhali` validation** — distinct types, distinct regexes
  (`/^[a-z0-9-]+$/i` and `/^\d+$/`); on manual add the IdHAL control carries an
  explicit `idHal_s` / `idHal_i` switcher that selects the type (no format
  inference). ORCID: `/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i`, applied after
  `normalize()`.

## Tests

- **Authz matrix** — extend `tests/app/authz/server/identifiers.authz.test.ts` to
  cover every cell of the §1 table across IdRef, ORCID, IdHAL: authenticate
  (own only), add-without-auth (wide only), remove non-authenticated (own or
  wide), remove authenticated (own only), and all "No action" cases.
- **Remove-before-add** — API test asserting a 409 when adding a type that already
  exists.
- **Authentication consistency** — callback tests for equal value (→ `UPDATE`,
  authenticated), different value (→ failure + error message, nothing written),
  and empty (→ `ADD`, authenticated).
- **Messages** — `PersonService` / `ActionDispatchService` tests asserting the
  right action type, routing key, and `authenticated` flag for each event in §5,
  including value-change = remove + add (two messages, no update).
- **UI** — control tests for the rendered action set per actor/state, the manual
  ORCID/IdHAL add form for wide editors, and the mismatch error surfacing.
