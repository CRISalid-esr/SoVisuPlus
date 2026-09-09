# Send a single global contributor-update message

## Goal

When a user saves changes on a document's **Authors** tab, the application must
emit **one authoritative message describing the new, complete state of the
document's contributions** instead of the current series of atomic per-change
messages (one `ADD` / `UPDATE` / `REMOVE` per contributor).

The graph (CRISalid IKG middleware) receives this single message and replaces
the document's contribution set with the state it carries.

---

## Current behaviour (to be replaced)

Saving today produces **N atomic actions**, one per changed contributor:

1. The client diffs the loaded baseline against the working copy in
   `buildContributionChanges`
   (`src/app/[lang]/documents/[uid]/components/Authors/lib/contributionDiff.ts`).
   It returns a `ContributionChange[]` of `ADD` / `UPDATE` / `REMOVE` entries —
   only the contributors that actually changed.

2. `useContributionsEditor.save()` POSTs those changes to
   `POST /api/documents/[uid]/contributions`
   (`src/app/api/documents/[uid]/contributions/route.ts`).

3. `DocumentService.saveContributions()`
   (`src/app/lib/services/DocumentService.ts`) writes **one `Action` row per
   change** (`targetType: DOCUMENT`, `path: 'contributions'`), in a sequential
   loop. Each row's `parameters` carries `id` (its position in the batch) and
   `nextId` (the next position, or `null` for the last row) so the graph can tell
   when the batch is complete. The document is then flagged
   `waiting_for_update`.

4. The change poller (`ActionDispatchService`) picks up undispatched `Action`
   rows in insertion order and publishes each to RabbitMQ on the `graph`
   exchange with routing key
   `task.documents.document.{add|update|remove}`.

The `id` / `nextId` sequencing and the strict "create sequentially, not
`Promise.all`" ordering exist **only** to let the consumer reassemble a complete
picture from fragments. A single authoritative message removes that need.

---

## Target behaviour

On save, emit **one** action/message that contains the full contribution list
for the document — the new desired state — not a per-contributor delta.

The message represents the complete, ordered set of contributions the document
should have after the save. The graph treats it as authoritative: contributors
present in the message are created/updated; contributors absent from it are
removed. No `id` / `nextId` chaining, no multi-row batch.

### Resolved design points

- **Action type & routing key** — reuse the existing `UPDATE` action type, which
  publishes on routing key `task.documents.document.update`. No new action type
  or routing key is introduced.

- **Payload shape** — the new message's `parameters` carries the ordered list of
  contributions, each with the same fields as the current per-contribution
  payload (`person`, `roles`, `rank`, `affiliations` — see
  `ContributionActionParameters` in `src/app/types/ContributionAction.ts`). When
  ranking mode is **off**, each contribution's `rank` is `null` (unchanged from
  today's per-contribution behaviour).

- **Empty list** — saving a document down to zero contributors is expressed as a
  message carrying an empty contribution list; the graph removes all
  contributors accordingly.

---

## Required changes (by layer)

- **`src/app/types/ContributionAction.ts`** — add the new full-state payload
  type. Keep or retire the delta `ContributionChange` types depending on whether
  the client still computes a diff (see below).

- **Client diff (`contributionDiff.ts`)** — with a full-state message the client
  sends the entire working list directly, so `buildContributionChanges` is no
  longer used to build deltas for the request. **Dirty detection** (the editor
  uses `changes.length > 0` to know the tab is dirty / enable Save) must be
  preserved by replacing it with a **baseline-vs-working comparison**: normalise
  both the baseline contributions and the working copy to the full-state payload
  and compare (the existing `normalize` / `toContributionParameters` helpers can
  be reused). The tab is dirty when the two differ.

- **`useContributionsEditor.ts` / `documentSlice.ts`** — send the full
  contribution state instead of the change array.

- **API route (`contributions/route.ts`)** — update request validation for the
  new payload. **Preserve the existing authorization rules:**
  - `update` permission on the document's `contributors` field, and
  - the "a user may not remove their own contribution" rule — re-express this
    against the new full-state payload (own person uid must still be present in
    the submitted list).

- **`DocumentService.saveContributions()`** — write **one** `Action` row, drop
  the `id` / `nextId` sequencing and the sequential-loop ordering comment. Still
  flag the document `waiting_for_update`.

- **`ActionDispatchService`** — no change needed: the reused `UPDATE` action
  already maps to routing key `task.documents.document.update`.

---

## Constraints

- Contribution data is still **not** written to the app DB on save. The action →
  poller → RabbitMQ → graph → AMQP round-trip remains the source of truth; the
  document comes back via AMQP and resets `waiting_for_update` to `default`.
- The pessimistic-freeze UX (`Document.isFrozen` / `waiting_for_update`) is
  unchanged.
- The message contract (reused `UPDATE` action, routing key
  `task.documents.document.update`, full-state `parameters` payload) must be
  understood by the graph consumer (IKG middleware).

## Tests

- Update unit tests for `contributionDiff` / dirty detection.
- Update `DocumentService.saveContributions` tests to assert a single `Action`
  row carrying the full state (no `id`/`nextId`).
- Update API route tests, especially the own-contribution-removal guard against
  the new payload.
