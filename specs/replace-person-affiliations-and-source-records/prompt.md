# Replace person memberships, employments and source-person links instead of upserting

## Goal

Make person synchronisation authoritative, the way document titles/abstracts became in
PR [#905](https://github.com/CRISalid-esr/SoVisuPlus/pull/905): when the graph sends a
person, affiliations and source-person links absent from the incoming data should be
pruned from the local database instead of accumulating forever.

- **Memberships / employments** — rows in `membership` / `employment` not present in the
  incoming set are deleted.
- **Source-person records** — `SourcePerson` rows linked to the person but absent from the
  incoming set are _unlinked_ (`personId: null`), **not deleted**, because they are also
  referenced by `SourceContribution` rows of document records.

## Reference implementation

A working implementation was written and then removed from PR #905 (removed by commit
`76bc0754` on the `titles-and-abstracts-update` branch; the original hunks are in commit
`84c46fcb`). Recover it from there rather than rewriting:

- `PersonDAO.upsertMemberships` / `upsertEmployments` — resolve-then-prune-then-upsert
  shape: resolve each incoming organization unit uid to a db id, `deleteMany` rows whose
  `organizationUnitId` is `notIn` the resolved set, then upsert. Units that fail to
  resolve are safe to leave out of the prune set: a membership row cannot reference an
  organization unit absent from the database.
- `PersonDAO.upsertRecords` — after upserting incoming records, `updateMany` with
  `uid: { notIn: incomingUids }` setting `personId: null`.
- Unit tests (`src/app/lib/daos/PersonDAO.test.ts`) and integration tests
  (`tests/app/lib/daos/PersonDAO.test.ts`) covering the pruning behaviour.

## Why it was removed: blockers to resolve first

The implementation was correct for the person-AMQP-message flow, but
`PersonDAO.createOrUpdatePerson` has three callers with different data completeness, and
pruning treats _absent_ as _authoritatively gone_. As merged it would have caused silent
data loss:

1. **`recorded_by` is not fetched by `person.graphql`** — removed in commit `72070c1a`
   (PR #875) because the graph GraphQL API stopped exposing it after the
   organization-model refactoring (see the comment in
   `src/app/lib/graphql/PersonGraphQLClient.ts` on `GraphPersonResponse.recorded_by`).
   `person.records` therefore always hydrates as `[]`, and the unlink would fire with an
   empty keep-list on **every person message**, severing all person↔source-person links.
   → The graph API must re-expose `recorded_by` and `person.graphql` must select it
   before the unlink can ship.

2. **`document.graphql`'s contributor fragment fetches `membershipsConnection` but not
   `employmentsConnection`** — contributor persons hydrate with `employments: []`, so
   every document message would delete all employments of every contributor
   (`DocumentDAO.createOrUpdateDocument` calls `createOrUpdatePerson(contribution.person)`).
   → Either add `employmentsConnection` (and `recorded_by`) to the contributor fragment,
   or exclude the document flow from pruning.

3. **`UserService.provisionUser` builds a bare `Person`** (no memberships, employments or
   records) — provisioning a username whose person already arrived through AMQP would
   wipe their affiliations and unlink their source persons.
   → The provisioning flow must never prune.

**Recommended design:** make pruning explicit per caller instead of implicit in
`createOrUpdatePerson`. Only `PersonWorker` carries the person's complete relation set
(the person message is also the only place that can prune memberships, since an
organization unit's message never enumerates its members). Either expose dedicated
`replace*` DAO methods used by `PersonWorker` alone, or add an `authoritative` flag to
`createOrUpdatePerson` defaulting to upsert-only.

## Secondary concerns

- **Skipped hydration edges must not be pruned.** `hydrateAffiliationEdges`
  (`PersonGraphQLClient.ts`) drops membership/employment edges whose organization
  category cannot be determined. Such an edge can correspond to an existing db row
  (created earlier from a richer payload); pruning would delete a relation the graph
  still asserts. Skipped edges should count toward the keep-set, or hydration should
  stop skipping.
- **Transactionality.** Wrap each prune+upsert in `prismaClient.$transaction` so a crash
  between the `deleteMany` and the upserts cannot leave the person without affiliations
  until the next message.
- **Orphaned `SourcePerson` rows.** Unlinked rows (`personId: null`) accumulate and are
  never cleaned up. Decide whether a cleanup (delete when no `SourceContribution`
  references remain) is needed, or document the accumulation as accepted.

## Test requirements

Beyond the pruning tests recoverable from `84c46fcb`, add integration tests for the
paths where the original implementation failed:

- Processing a document message must not erase a contributor's employments or unlink
  their source persons.
- A person message with hydrated records must prune only stale source-person links.
- `UserService.provisionUser` on an existing person must leave memberships, employments
  and source-person links untouched.
