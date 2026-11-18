# Allow cross-DAO transactions

## Intent

A service that writes through two DAOs (e.g. a document write then
`ActionDAO.createAction`) cannot make both writes atomic today: every DAO is bound to the
Prisma singleton by `AbstractDAO`, and the only transactions in the codebase are private
to a single DAO method. A crash between the two writes leaves a change that is never
forwarded to the graph, or an `Action` whose underlying change was never persisted.

The person-identifier flows work around this inside the DAO: `PersonDAO` methods take
the `Action`s to record as a parameter and write them in their own transaction
(`recordActions`). That only works when one DAO method owns the whole write.

This feature lets a service run several DAO calls, across several DAOs, in one database
transaction, without breaking the rule that services never use Prisma directly.

## Scope

- **Mechanism** (DAO layer):
  - `AbstractDAO` accepts an injected database client; the singleton remains the default.
  - A `runInTransaction()` helper, exported from the DAO layer, opens an interactive
    transaction and hands the transaction client to the callback.
  - Existing DAO-internal transactions and nested DAO instantiations are made
    transaction-aware so a DAO bound to a transaction client keeps working.
- **No consumer yet**: `runInTransaction` is not called by production code in this
  change. The `PersonService` identifier flows are not migrated: their identifier write
  and `Action` creation are already atomic through the `actions` parameter of the
  `PersonDAO` methods.
- **Out of scope** (follow-up branch): adopting `runInTransaction`. Writes are grouped
  in one transaction only when one makes no sense without the other: an `Action`
  without the change it announces (or the reverse), or a partial write granting
  unwarranted rights. Planned consumers: the `DocumentService` flows pairing a document
  write with `createAction`, `RoleService.assignRoleToUser` (a `UserRole` without its
  scope is a global role), `RoleDAO.setRolePermissions`, and the `PersonService`
  identifier flows (moving `Action` creation back to `ActionDAO` and dropping
  `recordActions`).

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
  const documentDAO = new DocumentDAO(tx)
  const actionDAO = new ActionDAO(tx)
  await documentDAO.deleteDocumentByUid(documentUid)
  await actionDAO.createAction({ ... })
})
```

Calling `runInTransaction` from inside another `runInTransaction` callback opens a
second, independent transaction. This is not supported and is not guarded against;
services must build their tx-bound DAOs at the outermost level.

### Making existing DAO code transaction-aware

1. **DAO-internal transactions** — `PersonDAO` calls `this.prismaClient.$transaction`
   in `upsertMemberships`, `upsertEmployments`, `upsertIdentifiers`,
   `upsertHalIdentifiers`, `createIdentifiers`, `markIdentifiersValidated`,
   `markPersonValidated`, `upsertAuthenticatedOrcidIdentifier` and `deleteIdentifier`
   (the `Action`s these methods record join the same transaction); so does
   `DocumentDAO.deleteDocumentByUid`. These become `this.transaction(...)`. When the DAO is bound
   to a transaction client the callback simply runs on that client, so the writes join
   the outer transaction instead of failing to compile.
2. **Nested DAO instantiation** — DAOs that create other DAOs internally
   (`PersonDAO` → `OrganizationUnitDAO`, `SourcePersonDAO`; `DocumentDAO` → `ConceptDAO`,
   `PersonDAO`, `AuthorityOrganizationDAO`, `SourcePersonDAO`) pass `this.prismaClient`
   to the constructor, so a tx-bound DAO never silently escapes to the singleton.
3. **Search helpers** — `withWordSimilarityThreshold` (`daos/search/trigramSearchSql.ts`),
   `expandSearchTokens` (`daos/search/SearchTermExpander.ts`) and
   `backfillNormalizedColumn` take a `PrismaClient`. Their parameter type widens to
   `DbClient`. The first and last use the batch form `$transaction([...])`; so does
   `OrganizationUnitDAO.applyEffectiveHidden`. All three go through `runBatch(client,
queries)` (`AbstractDAO.ts`): a batch transaction on the singleton (unchanged
   behaviour), the statements run sequentially on a transaction client. For
   `set_config(..., is_local = true)` the setting is then local to the enclosing
   transaction, which is the intended effect.
4. **P2002 retry loops** — `PersonDAO.createOrUpdatePerson`, `PersonDAO.createPerson`
   and `OrganizationUnitDAO.createOrUpdateOrganizationUnit` (slug collision), and the
   `upsertIdentifiers` methods of `PersonDAO`, `DocumentDAO` and `SourcePersonDAO`
   catch `P2002` and retry. On PostgreSQL the
   first failed statement aborts the whole transaction, so a retry on the same
   transaction client would fail with "current transaction is aborted". When
   `this.inTransaction` is true these methods do **not** retry: the error propagates (the
   `upsertIdentifiers` methods, which log and swallow it after the last retry on the
   singleton, rethrow it at once), the
   outer transaction rolls back, and retrying the whole `runInTransaction` block is the
   caller's decision. Behaviour on the singleton is unchanged. The other `P2002`
   handlers of `PersonDAO` do not retry (they throw `IdentifierConflictError`), so they
   behave the same inside a transaction.

## Testing

- **Unit** (`src/app/lib/daos/AbstractDAO.test.ts`): `transaction()` opens a new
  transaction on a singleton-bound DAO and joins the existing client on a tx-bound DAO;
  `inTransaction` reflects the injected client. Existing DAO unit tests keep mocking
  `PrismaClient` and its `$transaction` as today.
- **Integration** (`tests/app/lib/daos/transaction.test.ts`): two DAOs built from the
  same `runInTransaction` client; when the callback throws after both writes, neither
  row exists; when it completes, both do. A tx-bound `PersonDAO` joining its internal
  transaction (`upsertHalIdentifiers`) commits with the outer transaction.
