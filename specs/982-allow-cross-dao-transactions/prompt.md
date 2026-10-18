# Allow cross-DAO transactions

## Intent

A service that writes through two DAOs (e.g. `PersonDAO.upsertIdentifier` then
`ActionDAO.createAction`) cannot make both writes atomic today: every DAO is bound to the
Prisma singleton by `AbstractDAO`, and the only transactions in the codebase are private
to a single DAO method. A crash between the two writes leaves an identifier change that
is never forwarded to the graph, or an `Action` whose underlying change was never
persisted.

This feature lets a service run several DAO calls, across several DAOs, in one database
transaction, without breaking the rule that services never use Prisma directly.

## Scope

- **Mechanism** (DAO layer):
  - `AbstractDAO` accepts an injected database client; the singleton remains the default.
  - A `runInTransaction()` helper, exported from the DAO layer, opens an interactive
    transaction and hands the transaction client to the callback.
  - Existing DAO-internal transactions and nested DAO instantiations are made
    transaction-aware so a DAO bound to a transaction client keeps working.
- **First consumer**: the four identifier flows of `PersonService` (`addIdentifier`,
  `authenticateOrcidIdentifier`, `authenticateHalIdentifier`, `removeIdentifier`) run
  the identifier write and the `Action` creation in one transaction.
- **Out of scope** (follow-up): the `createAction` call sites in `DocumentService` and
  `api/documents/harvestings/route.ts`. They would benefit from the same treatment but
  are not migrated here.

## Design

### Client injection

```ts
// src/app/lib/daos/AbstractDAO.ts
export type DbClient = PrismaClient | Prisma.TransactionClient

export class AbstractDAO {
  protected prismaClient: DbClient
  /** true when this DAO is bound to an already-open transaction */
  protected readonly inTransaction: boolean

  constructor(client: DbClient = prisma) {
    this.prismaClient = client
    this.inTransaction = !('$transaction' in client)
  }

  /**
   * Run `fn` in a transaction. Opens a new one on the singleton, or joins the
   * transaction this DAO is already bound to (Prisma does not nest transactions).
   */
  protected transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>
}
```

`Prisma.TransactionClient` is the singleton's type minus `$transaction`, `$connect`,
`$disconnect`, `$on`, `$use` and `$extends`, so every model query compiles unchanged
against `DbClient`. Only code that calls `$transaction` on `this.prismaClient` must change
(see below).

### Service-facing helper

```ts
// src/app/lib/daos/transaction.ts
export async function runInTransaction<T>(
  fn: (tx: DbClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T>
```

Thin wrapper around `prisma.$transaction(fn, options)` on the same singleton
`AbstractDAO` uses (`@/lib/daos/prisma`). Services import it from the DAO layer and never
import `@prisma/client`; the callback parameter is only ever forwarded to DAO
constructors, so services do not need to name its type.

```ts
await runInTransaction(async (tx) => {
  const personDAO = new PersonDAO(tx)
  const actionDAO = new ActionDAO(tx)
  await personDAO.upsertIdentifier(identifier, personUid)
  await actionDAO.createAction({ ... })
})
```

Calling `runInTransaction` from inside another `runInTransaction` callback opens a
second, independent transaction. This is not supported and is not guarded against;
services must build their tx-bound DAOs at the outermost level.

### Making existing DAO code transaction-aware

1. **DAO-internal transactions** — `PersonDAO` calls `this.prismaClient.$transaction`
   in `upsertMemberships`, `upsertEmployments`, `upsertIdentifiers` and
   `upsertHalIdentifiers`; so do `DocumentDAO.deleteDocumentByUid` and
   `OrganizationUnitDAO.applyEffectiveHidden` (the latter in batch form, rewritten as
   an interactive callback). These become `this.transaction(...)`. When the DAO is bound
   to a transaction client the callback simply runs on that client, so the writes join
   the outer transaction instead of failing to compile.
2. **Nested DAO instantiation** — DAOs that create other DAOs internally
   (`PersonDAO` → `OrganizationUnitDAO`, `SourcePersonDAO`; `DocumentDAO` → `ConceptDAO`,
   `PersonDAO`, `AuthorityOrganizationDAO`, `SourcePersonDAO`) pass `this.prismaClient`
   to the constructor, so a tx-bound DAO never silently escapes to the singleton.
3. **Search helpers** — `withWordSimilarityThreshold` (`daos/search/trigramSearchSql.ts`),
   `expandSearchTokens` (`daos/search/SearchTermExpander.ts`) and
   `backfillNormalizedColumn` take a `PrismaClient`. Their parameter type widens to
   `DbClient`. The first and last use the batch form `$transaction([...])`; when given a
   transaction client they run the statements sequentially on it instead. For
   `set_config(..., is_local = true)` the setting is then local to the enclosing
   transaction, which is the intended effect.
4. **P2002 retry loops** — `createOrUpdatePerson` and `createPerson` (slug collision),
   `upsertIdentifiers` and `upsertIdentifier` catch `P2002` and retry. On PostgreSQL the
   first failed statement aborts the whole transaction, so a retry on the same
   transaction client would fail with "current transaction is aborted". When
   `this.inTransaction` is true these methods do **not** retry: the error propagates, the
   outer transaction rolls back, and retrying the whole `runInTransaction` block is the
   caller's decision. Behaviour on the singleton is unchanged.

### `PersonService` identifier flows

Each of the four methods wraps its existing body in `runInTransaction`, building
`PersonDAO` and `ActionDAO` from the transaction client. `recordIdentifierAction` takes
the `ActionDAO` to use as a parameter instead of reading `this.actionDAO`. The
pre-check reads (`findIdentifierValue`) move inside the transaction as well, so the
ADD/UPDATE decision and the write see the same snapshot. Error wrapping and messages are
unchanged.

Since the `Action` row is only visible after commit, the change poller
(`ActionDispatchService`) can no longer pick up an action whose identifier write was
rolled back.

## Testing

- **Unit** (`src/app/lib/daos/AbstractDAO.test.ts`): `transaction()` opens a new
  transaction on a singleton-bound DAO and joins the existing client on a tx-bound DAO;
  `inTransaction` reflects the injected client. Existing DAO unit tests keep mocking
  `PrismaClient` and its `$transaction` as today.
- **Integration** (`tests/app/lib/daos/transaction.test.ts`): two DAOs built from the
  same `runInTransaction` client; when the callback throws after both writes, neither
  row exists; when it completes, both do. A tx-bound `PersonDAO` joining its internal
  transaction (`upsertHalIdentifiers`) commits with the outer transaction.
- **Integration** (`tests/app/lib/services/PersonService.test.ts`): for each identifier
  flow, when `ActionDAO.prototype.createAction` is made to throw, the identifier table is
  unchanged; on success both the identifier and the `Action` row exist (existing
  assertions).
