# Consume graph change events and report user-action outcomes to the user

Issue: https://github.com/CRISalid-esr/sovisuplus/issues/868

This is the sovisuplus counterpart of the IKG spec
[`improve-error-reporting-for-user-actions#402`](https://github.com/CRISalid-esr/crisalid-ikg/issues/402)
(local path: `~/PycharmProjects/crisalid-ikg/specs/improve-error-reporting-for-user-actions#402/prompt.md`).
Read that spec first — it defines the message contract this feature consumes.

---

## Context

When a user performs a graph-bound action (e.g. saving the **Authors** tab),
sovisuplus writes an `Action` row, the change poller
(`ActionDispatchService`) publishes it to RabbitMQ, and the document is
flagged `waiting_for_update` (both in the DB and in the Zustand store), which
freezes the Authors tab. Unfreezing relies **entirely on the happy path**: the
graph applies the change, emits `document_updated`, `DocumentWorker` re-writes
the document with `state: default`, and the client refetches.

Today, when the graph fails to apply the action — or silently drops part of it
(an unresolvable contributor, a skipped affiliation) — **nothing comes back**:

- on hard failure the document stays frozen forever (until a manual refresh of
  the graph side) and the user is never told;
- on partial failure the user gets a positive "document updated" toast for a
  save that silently lost data.

The IKG now emits two dedicated outcome events for every registered user
action, in interactive mode only:

```
event.changes.change.applied.interactive
event.changes.change.failed.interactive
```

Payload (see IKG spec §B for the authoritative definition):

```jsonc
{
  "type": "change",
  "event": "applied | failed",
  "fields": {
    "uid": "sovisuplus:<action-id>",
    "id": "<action-id>", // the Action row id sovisuplus minted
    "application": "sovisuplus",
    "person_uid": "local-user1", // the acting user
    "target_type": "DOCUMENT",
    "target_uid": "…",
    "path": "contributions",
    "action_type": "UPDATE",
    "status": "applied | failed",
    "error_message": "… | null", // hard-failure cause
    "warnings": [
      // per-item losses (partial success)
      {
        "code": "UNRESOLVABLE_PERSON",
        "message": "…",
        "context": { "display_name": "…" },
      },
    ],
    "timestamp": "2026-01-01T09:00:00Z",
  },
}
```

`event: applied` with non-empty `warnings` is the **partial success** case.
On success sovisuplus receives `change.applied` _and_ the usual
`document_updated`; on failure **only** `change.failed` — so `change.failed`
is the sole unfreeze signal for the failure path.

## Goal

1. **Consume** the two new change events in the listener process.
2. **Unfreeze** the target document on failure (reset `waiting_for_update` →
   `default`), since no `document_updated` will do it.
3. **Notify the acting user only** — a toast (notistack snackbar) reporting
   success with warnings ("saved, but 1 contributor could not be resolved")
   or failure, visible on whatever page the user is currently on.

## Existing mechanisms this feature builds on (assessment)

- **Display channel** — already exists: `WebSocketListener`
  (`src/app/lib/websocket/WebSocketListener.tsx`) is mounted in `MainLayout`,
  so it survives client-side navigation, and already drives notistack
  snackbars (`enqueueSnackbar`) for `DataEvent`s. No new UI infrastructure is
  needed — only a new event type and a dedicated rendering branch.
- **Per-user targeting** — already the established pattern: the WebSocket
  server broadcasts every event to all connected clients and each client
  filters for relevance (`DataEvent.impliedPeopleUids`,
  `HalDepositEvent.personUid` vs `connectedUser.person.uid` from the user
  slice). Change events filter on `personUid === connectedUser.person.uid`,
  so only the acting user sees the outcome toast — on any page. Note this is
  _display_ filtering, not _delivery_ filtering (the WS broadcast is
  unauthenticated); the warning contexts echo user-typed names, which is the
  same exposure level as the document titles already broadcast in
  `DataEvent`s — acceptable under the current architecture.
- **Message contract fit** — the payload is well suited to the existing
  consumer: `type: "change"` slots into the `msg.type`-discriminated
  typeguards (`src/app/lib/amqp/utils/typeGuards.ts`); `id` echoes the
  `Action` row id so correlation is direct; `person_uid` / `target_uid` cover
  filtering and unfreezing. Two consumer-side notes:
  - fields are snake_case (IKG convention) and must be mapped to camelCase at
    the worker boundary, like other inbound messages;
  - the payload deliberately carries **no document labels**, so a toast shown
    away from the document page cannot name the document from the payload
    alone — the worker enriches the WS event with labels from the local DB
    (same `buildObjectLabelsFromLiterals` idea as `DocumentWorker`).

---

## Required changes (by layer)

### 1. AMQP binding (`src/app/lib/amqp/AmqpConnection.ts`)

Add `'event.changes.change.*.interactive'` to `INTERACTIVE_BINDING_KEYS`.
No batch binding: the IKG emits change events in interactive mode only
(batch replays stay silent).

### 2. Inbound message type and guard

- New `AMQPChangeEventMessage` in `src/app/types/`:
  `type: 'change'`, `event: 'applied' | 'failed'`, `fields` per the contract
  above (including `warnings: { code, message, context }[]`).
- Add it to the `AMQPMessage` union and a `isChangeEventMessage` guard
  (`msg.type === 'change'`) in `typeGuards.ts`.

### 3. `ChangeEventWorker` (`src/app/lib/amqp/workers/`)

Registered in `MessageProcessingWorkerFactory`. Responsibilities:

- **On `failed`** with `target_type === 'DOCUMENT'`: reset the target
  document's state from `waiting_for_update` back to `default` via
  `DocumentDAO` (new small method, e.g. `resetDocumentsWaitingForUpdate`,
  mirror of `markDocumentsWaitingForUpdate`). The graph state is untouched on
  failure, so the locally stored (pre-action) document is still correct —
  unfreezing simply re-enables editing of the old state.
- **On `applied`**: no DB write — the `document_updated` message that follows
  on the same interactive queue performs the re-write and state reset as
  today.
- **Both cases**: look up the target document locally to build `objectLabels`
  (fallback to the uid), then return a new `UserActionOutcomeEvent` for
  broadcast.
- A change event whose target document is unknown locally must still produce
  the outcome event (labels fall back to the uid) — the IKG emits
  `change.failed` even when the target does not exist (spec §G).

### 4. Outbound WS event (`src/app/types/`)

New `UserActionOutcomeEvent extends EventBase`, `type = 'user_action_outcome'`,
carrying: `actionId`, `outcome: 'applied' | 'failed'`, `personUid`,
`targetType`, `targetUid`, `path`, `actionType`, `errorMessage`,
`warnings: { code, message, context }[]`, `objectLabels`, `timestamp`.
Add it to the `GenericEvent` union with an `isUserActionOutcomeEvent` guard.

### 5. Client (`WebSocketListener.tsx` + store)

- **Relevance filter**: handle the event only when
  `personUid === connectedUser.person.uid`. Other users are not concerned by
  the outcome toast (they still get the regular `document_updated` toast on
  success).
- **Unfreeze on failure**: if the store's `selectedDocument.uid` matches
  `targetUid`, call `setSelectedDocumentHasChanged(true)` — the refetch
  returns the DB document whose state the worker just reset to `default`, so
  the Authors tab unfreezes through the existing mechanism (no new store
  path).
- **Toasts** (dedicated rendering branch, distinct from the `DataEvent`
  toast):
  - `applied` + empty `warnings` → **success** variant: "your change to
    _{label}_ was saved". Keep it light — the generic `document_updated`
    toast also fires; consider letting this toast replace it for the acting
    user rather than stacking two.
  - `applied` + non-empty `warnings` → **warning** variant, long
    `autoHideDuration` (or persist until dismissed): "saved, but N items
    could not be applied", with the warning list.
  - `failed` → **error** variant, **persist until dismissed**: "your change
    to _{label}_ could not be saved", with the translated failure cause where
    possible, plus a link to the document page (same pattern as the
    `DataEvent` toast).
- **i18n**: translate warnings by `code`
  (`UNRESOLVABLE_PERSON`, `EXTERNAL_PERSON_CREATION_FAILED`,
  `MISSING_DISPLAY_NAME`, `AFFILIATION_CONFLICT`,
  `AFFILIATION_WITHOUT_IDENTIFIER` — taxonomy in IKG spec §B), interpolating
  `context` values (e.g. `display_name`). The taxonomy is open: an unknown
  `code` must render a generic fallback message, never break the toast. The
  raw English `message` field is a debugging aid, not display copy. New keys
  go through `npm run i18n:extract`, per project convention.

### 6. Optional — record the outcome on the `Action` row

The `id` field correlates directly to the `Action` row. Recording the outcome
there (`status: applied | failed`, `errorMessage`, `warnings` JSON) would give
an audit trail and a base for future "you missed these outcomes while away"
UX. **Decision: in scope only if cheap** — a nullable `status`/`outcome`
column set by the worker; replaying missed outcomes to the UI is explicitly
out of scope.

---

## Constraints

- Existing event handling (`DataEvent`, harvesting, HAL deposit) is unchanged.
- The pessimistic-freeze UX (`Document.isFrozen` / `waiting_for_update`) is
  unchanged on the success path; this feature only adds the failure-path
  unfreeze.
- The worker must be resilient to contract drift: missing `warnings`
  (treat as `[]`), unknown warning codes, unknown `target_type` (log, still
  broadcast).
- A toast is fire-and-forget: if the user is offline when the outcome
  arrives, it is lost (acceptable; see §6 for the audit-trail hook).

## Out of scope

- Unregistered actions (`FETCH`, person-`ADD`) — the IKG does not emit change
  events for them yet (tracked separately on the IKG side).
- A persistent notification center / replay of outcomes missed while
  disconnected.
- Delivery-level per-user filtering on the WebSocket (authenticating WS
  connections) — display filtering follows the existing pattern.

## Tests

- `ChangeEventWorker` unit tests: failed → DAO state reset called + event
  built; applied → no DB write; unknown target document → event still built
  with uid fallback labels; malformed/missing `warnings` tolerated.
- `typeGuards` test for `isChangeEventMessage`; factory test for the new
  routing.
- `WebSocketListener` tests: outcome toast shown only when `personUid`
  matches the connected user; correct variant per outcome/warnings; unfreeze
  refetch triggered when the selected document is the target; unknown warning
  code renders the fallback.
- `DocumentDAO` test for the state-reset method.
