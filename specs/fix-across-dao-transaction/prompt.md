# Adopt cross-DAO transactions

## Intent

[`982-allow-cross-dao-transactions`](../982-allow-cross-dao-transactions/prompt.md) added
the mechanism (`runInTransaction`, client injection in `AbstractDAO`) without any
consumer. This branch adopts it with one rule: **a user action must never leave partial
or inconsistent data**. Writes are grouped in one transaction when one makes no sense
without the other:

- a change and the `Action` that forwards it to the graph;
- a derived state and its source (effective visibility of structures);
- a HAL deposit and its files;
- any partial write granting unwarranted rights (a role without its scope, permissions
  that should have been removed).

## Migrated flows

| Flow                                                                                                                                                                                              | Grouped writes                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PersonService`: `addIdentifier`, `authenticateOrcidIdentifier`, `authenticateHalIdentifier`, `validateIdentifier`, `validateProfile`, `removeIdentifier`                                         | identifier write + its `Action`s                                               |
| `DocumentService`: `saveContributions`, `addConceptsToDocument`, `deleteConceptsFromDocument`, `modifyTitles`, `modifyAbstracts`, `mergeDocuments`, `updateDocumentType`, `updatePublicationDate` | document write + its `Action`s                                                 |
| `DocumentDAO.modifyTitles` / `modifyAbstracts`                                                                                                                                                    | read of the current values + delete + update; the replaced values are returned |
| `RoleService.assignRoleToUser`                                                                                                                                                                    | `UserRole` + its scopes                                                        |
| `RoleDAO.setRolePermissions`                                                                                                                                                                      | permission additions + removals                                                |
| `OrganizationUnitService.setHidden`                                                                                                                                                               | `hidden` flag + recompute of `hiddenEffective`                                 |
| `DocumentService.createHalDepositWithFiles`                                                                                                                                                       | HAL deposit + its file rows                                                    |

### Notable changes

- **Actions are created by `ActionDAO` only.** `PersonDAO.recordActions` and the
  `actions` parameter of the `PersonDAO` identifier methods are removed. The service
  creates the `Action`s (`ActionDAO.createAction` / `createActions`) in the same
  `runInTransaction` as the change. `validateProfile` creates them only when
  `markPersonValidated` returns `true`.
- **REMOVE actions for titles and abstracts** are built from the values that
  `DocumentDAO.modifyTitles` / `modifyAbstracts` read inside the transaction, not from
  the document the route loaded earlier.
- **HAL deposit files** are written to `hal-files/<uuid>/` (`halFilesDir(uploadKey)`)
  before the transaction, since the deposit id is not known yet. The route checks every
  announced file before any write. If the transaction fails, the directory is removed
  (best effort: orphan files are accepted). The `deleteHalDeposit` compensation is gone.
  Existing deposits keep their stored `filePath`.
- **`recomputeEffectiveHidden`** takes an optional `OrganizationUnitDAO` (default: the
  service's own), so `setHidden` runs it on the transaction client while the AMQP worker
  keeps calling it as before. `fetchVisibilityState` runs after the commit.

## Rules

- Inside a `runInTransaction` callback, use only DAOs built with `tx`
  (`new XDAO(tx)`), never `this.xxxDAO`: those are bound to the singleton and would
  write outside the transaction.
- `Action`s are always created through `ActionDAO`.
- No `Promise.all` inside a transaction: a transaction uses one connection, so the
  queries run one after the other anyway. Use `for … of` loops.
- No I/O inside a transaction (HTTP, AMQP, disk, long computation): it keeps the
  transaction open, holding locks and a pool connection, and may hit the 5 s timeout.
  Do it before or after.
- Preliminary lookups (user, eligibility, external calls such as AureHAL) stay before
  the transaction. Reads that decide what to write go inside.
- Do not nest `runInTransaction` calls; no migrated flow calls another writing service.

## Out of scope

- **Admin scripts** (`UserService.provisionUser`…): would require passing `tx` to
  services themselves, or `AsyncLocalStorage`.
- **AMQP ingestion** (composite DAO methods, `PersonWorker`, `OrganizationUnitWorker`):
  the next message rewrites the state.
- **`HalDepositService`, `ActionDispatchService`, `KeycloakTokenService`**: external
  calls between writes, or concurrency concerns rather than atomicity.
- **Single-write routes** (e.g. `harvestings`).
- **Preliminary route checks** (409 on identifiers, ORCID, CAS, validation): a
  concurrency concern, already covered by unique constraints.
- **Concurrent title/abstract edits of the same document**: no row lock (it would need
  raw SQL `FOR UPDATE`); deferred.

## Testing

- Unit tests mock `@/lib/daos/transaction`
  (`runInTransaction: jest.fn(async (fn) => fn({}))`) and check the `ActionDAO` calls.
- Integration tests cover the rollback of each flow: a spy makes a later write fail
  (`jest.spyOn(XDAO.prototype, 'method').mockRejectedValueOnce(...)`) and the test
  asserts that the earlier write was not persisted.
