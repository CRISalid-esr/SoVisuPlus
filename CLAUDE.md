# CLAUDE.md

## Feature specs

Each major feature is backed by a spec document in `specs/<branch-name>/prompt.md`, where `<branch-name>` is the Git branch the feature is developed on. Read the relevant spec before working on a feature branch — it captures the intent, scope, and design decisions that are not otherwise visible from the code.

| Branch                                   | Spec                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `838-automated-hal-deposit`              | [`specs/838-automated-hal-deposit/prompt.md`](specs/838-automated-hal-deposit/prompt.md)                           |
| `send-global-contributor-update-message` | [`specs/send-global-contributor-update-message/prompt.md`](specs/send-global-contributor-update-message/prompt.md) |

## Git commits

- Commits trigger Husky pre-commit hooks (lint, type-check, etc.). Do not skip them.
- Commit messages must be short and to the point. A short bullet lists, no detailed explanations.
- Do not add a `Co-Authored-By` trailer or any other signature to commits.

## Application architecture

The application is containerised. The Docker image is built from `docker/staging/Dockerfile`, which runs two builds at image-build time:

- `npm run build` — Next.js web application (uses `tsconfig.json`)
- `npm run build:listener` — listener process compiled with `tsc` (uses `tsconfig.listener.json`, output goes to `dist-listener/`)

At container startup, `docker-bootstrap-app.sh` runs Prisma migrations and then launches two long-running processes in parallel:

- `npm run start:web` — Next.js server (`next start`)
- `npm run start:listener` — Node.js listener process (`node dist-listener/src/scripts/listener.js`)

### The listener (`src/scripts/listener.ts`)

The listener is a standalone Node.js process that starts three concurrent sub-systems:

**1. AMQP consumer** (`src/scripts/startAMQPConsumer.ts`)

Subscribes to RabbitMQ and processes inbound messages. These messages are emitted by external systems (an ETL pipeline, etc.) whenever a Person, ResearchUnit, or Document is created, updated, or deleted. Each message is dispatched to a typed worker via `MessageProcessingWorkerFactory` (`src/app/lib/amqp/workers/MessageProcessingWorkerFactory.ts`):

- `PersonWorker` — syncs the person and their data to the Neo4j graph via `PersonGraphQLClient`
- `ResearchUnitWorker` — syncs the research unit
- `DocumentWorker` — syncs the document via `DocumentGraphQLClient`
- `HarvestingStateEventWorker` / `HarvestingResultEventWorker` — handle harvesting lifecycle events

The GraphQL clients (`src/app/lib/graphql/`) call the Neo4j graph's GraphQL API. After a worker finishes processing, `MessageProcessingService` (`src/app/lib/amqp/services/MessageProcessingService.ts`) forwards the resulting events to the web process via WebSocket (see below).

**2. Change poller** (`src/scripts/startChangePoller.ts`)

Polls the database every 3 seconds for undispatched `Action` rows via `ActionDispatchService` (`src/app/lib/services/ActionDispatchService.ts`). When a user action in the web app must be forwarded to the Neo4j graph (e.g. merging documents), the web process writes an `Action` row to the database. The poller picks it up and publishes the corresponding message to RabbitMQ so the graph is kept in sync.

**3. WebSocket server** (`src/scripts/startWebSocketServer.ts`)

Starts a WebSocket server on port 3001. After each inbound RabbitMQ message is processed, `WebSocketNotifier` (`src/app/lib/websocket/WebSocketNotifier.ts`) broadcasts the resulting event to all connected web clients. The client-side counterpart is `WebSocketListener` (`src/app/lib/websocket/WebSocketListener.tsx`), which listens for these events and updates the UI in real time.

## Architectural principles

### Service and DAO layers

The backend is organised into two layers:

- **Service layer** (`src/app/lib/services/`) — contains business logic. Services call DAOs to read and write data; they never use Prisma directly.
- **DAO layer** (`src/app/lib/daos/`) — the only place where Prisma is used. DAOs execute queries and map Prisma results to domain TypeScript classes before returning them.

**Prisma entities must not leak outside DAOs.** The rest of the codebase (services, API routes, React components) works exclusively with typed TypeScript classes defined in `src/app/types/`. This keeps business logic decoupled from the ORM and makes the domain model explicit.

### `prisma/extended-client.ts`

Prisma's generated types only cover single tables. When a query uses `include` or `select` to join relations, the returned shape has no built-in type. `prisma/extended-client.ts` fills this gap: it exports composite types (e.g. `DocumentWithRelations`, `PersonWithRelations`, `UserWithRelations`) that describe the exact shape of each joined query result.

These types are **internal to the DAO layer**. DAOs use them to type the raw Prisma result, then immediately convert it to a domain class. The file also exports the singleton `prisma` client used by all DAOs.

#### When to add or update a composite type

Add or update a type here only when **all three** hold: a DAO runs a query with `include`/`select`, the joined shape can't be expressed by the base Prisma types, and that shape is passed to a domain mapper (`Foo.fromDb(...)`). This file is **demand-driven** — it describes shapes that are actually fetched, not every relation in the schema.

**Do not** try to describe every relation of every model. A model is joined in different shapes in different queries (different subsets, different depths), so no single `XWithRelations` type can stand for "the relations of X" — that is why, for example, both `RoleWithRelations` and `RoleWithPermissionIds` exist. Forcing a type per relation leads either to a maximal type that lies about queries fetching less, or to a combinatorial explosion of variant types. Only add the shape a query actually produces.

**Prefer deriving the type from the query.** Define the include once and let Prisma infer the payload, so the type cannot drift from the query:

```ts
const documentInclude = {
  titles: true,
  contributions: { include: { person: true } },
} satisfies Prisma.DocumentInclude

type DocumentWithRelations = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>
```

Reserve the hand-written `X & { … }` intersection types (the current style in this file) for cases where a derived type is impractical. Hand-written types have **no compiler link** to the query — a DAO that does `... as DocumentWithRelations` on an `include` block is an unchecked assertion, so the type and the query drift silently. Keep the two in sync when you touch either side.

### Zustand store

Client-side state is managed with [Zustand](https://zustand.docs.pmnd.rs/). All slices are combined into a single unified store in `src/app/stores/global_store.ts`, which is the only file components should import from.

```ts
import useStore from '@/stores/global_store'

const { documents, fetchDocuments } = useStore((state) => state.document)
const { currentPerspective } = useStore((state) => state.user)
```

Each slice owns a top-level key on the store:

| Slice file             | Key            | What it manages                                                           |
| ---------------------- | -------------- | ------------------------------------------------------------------------- |
| `documentSlice.ts`     | `document`     | Document list, selected document, pagination, filters, merge/edit actions |
| `personSlice.ts`       | `person`       | People search results and pagination (used for autocomplete)              |
| `researchUnitSlice.ts` | `researchUnit` | Research-unit search results and pagination                               |
| `userSlice.ts`         | `user`         | Authenticated user profile, current perspective (Person or ResearchUnit)  |
| `harvestingSlice.ts`   | `harvesting`   | Harvesting status and result counters, keyed by `personUid → platform`    |

**Rules:**

- Never import from a slice file directly — always go through `useStore` from `global_store.ts`.
- Never call fetch actions from server components or API routes; store actions are client-only.
- Slice actions call the application's Next.js API routes (`/api/…`) — they do not hit Prisma or services directly.

## Environment variables

Environment variables are loaded from `.env` at runtime.

### Adding a new variable

1. Document it in `docs/installation.md`.
2. Add it with a sample value to `.env.sample` so other developers know it exists.
3. Choose where to declare it based on whether it is baked into the bundle at build time:

| Scenario                                                               | Where to add it                                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Transpiled into the Next.js bundle (value must be known at build time) | `.env.docker` — copied into the image as `.env` during the Docker build stage |
| Not bundled — injected at runtime from the host environment            | `docker-bootstrap-app.sh` — appended to `.env` at container startup           |

### Making a `NEXT_PUBLIC_` variable available client-side without bundling it

`src/app/[lang]/components/EnvInjector.tsx` serialises server-side environment variables into a `<script>` tag that sets `window.env`. This allows `NEXT_PUBLIC_` variables that were **not** transpiled into the bundle to be accessed on the client side at runtime. Only `NEXT_PUBLIC_` keys are accepted; passing any other key throws an error.

## Authentication and authorization

### Authentication (`src/app/auth/auth_options.ts`)

Authentication is handled by [NextAuth.js](https://next-auth.js.org/) with a **JWT session strategy**. The only configured provider is **Keycloak** (OIDC). On sign-in, NextAuth receives the Keycloak profile and calls `UserService.submitProfile()` to create or update the user in the local database.

**Session lifetime** is controlled by `JWT_TOKEN_EXPIRATION_HOURS` (default 12 h, clamped to 1 h–168 h).

#### Accepted identifiers

The JWT callback resolves the local user from the Keycloak profile using one of two identifiers, in priority order:

1. `preferred_username` — the local username. If it looks like an EPPN (`jdupont@my-univ.fr`), the domain part is stripped and the result is matched as a `PersonIdentifierType.local` identifier. **This is a temporary workaround**: stripping the domain is bad practice, and once EPPN identifiers are stored in the database the full EPPN will be matched directly without truncation.
2. `orcid` — the ORCID iD surfaced by Keycloak (if the user has linked their ORCID account). Matched as a `PersonIdentifierType.orcid` identifier.

If neither identifier resolves to a known user the token is issued without an `authz` context (the user has no permissions).

### Authorization context

Once the user is resolved, `userToAuthzContext()` (`src/app/auth/ability.ts`) builds an `AuthzContext` from the user's role assignments and attaches it to the JWT. The context is forwarded to the session object and is available as `session.user.authz` everywhere in the app.

`abilityFromAuthzContext()` (same file) converts an `AuthzContext` into a CASL `AppAbility` instance. Scoped roles are translated into CASL conditions using MongoDB-style queries against `authzProperties.perimeter.<EntityType>`.

For testing, `makeAuthzContext()` and `makeAssignment()` in `src/app/auth/context.ts` provide helpers to build mock `AuthzContext` objects without hitting the database.

## RBAC role management

Permissions are managed with a scope-aware RBAC system powered by [CASL](https://casl.js.org/). Roles and their permissions are defined in `rbac.roles.yaml` at the project root and seeded into the database.

### Roles YAML

Each role has a `name`, optional `description` and `system` flag, and a list of `permissions`. Each permission has:

- `action` — e.g. `manage`, `read`, `update`, `delete`, `merge`, `unmerge`, `fetch_documents`
- `subject` — `Document`, `DocumentRecord`, `Person`, `ResearchUnit`, or `all`
- `fields` (optional) — field-level restriction for `update` actions (e.g. `[titles, abstracts]`)

After editing the file, reseed the database:

```bash
npm run init_roles
```

This upserts roles and permissions idempotently. It does **not** touch existing user assignments, except to remove assignments of deleted roles.

At container startup, `docker-bootstrap-app.sh` runs the equivalent compiled script (`npm run init_roles:js`) automatically, controlled by the `INIT_ROLES_ON_START` environment variable (default: `true`).

### Scopes

Roles can be assigned globally or scoped to a specific entity:

| Scope type                                        | Meaning                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `Person:<uid>`                                    | Permissions apply to documents where that person is a contributor |
| `ResearchUnit:<uid>`                              | Permissions apply to documents involving members of that unit     |
| `Institution:<uid>` / `InstitutionDivision:<uid>` | Same idea, broader perimeter                                      |
| _(no scope)_                                      | Global — applies everywhere                                       |

Assign a role with:

```bash
npm run assign_role -- \
  --role <roleName> \
  --person-uid <personUid> \
  [--scope <EntityType:entityUid>]
```

### Default self-scoped roles

The `DEFAULT_SELF_SCOPED_ROLES` environment variable (default: `document_editor,document_fetcher,document_merger`) lists roles automatically granted to every user scoped to their own `Person`. To seed these for all existing users:

```bash
npm run seed:self-scoped-defaults
```

### Adding a new permission

1. Add the action to the `PermissionAction` enum in `prisma/schema.prisma` and run `npx prisma migrate dev`.
2. Add a role that uses it in `rbac.roles.yaml`, then run `npm run init_roles`.
3. Assign the role to users with `npm run assign_role`.

### Checking permissions in code

**Client side (React) — UI only, not a security measure:**

```tsx
const ability = useMemo(() => abilityFromAuthzContext(session?.user?.authz), [session?.user?.authz])

<Can I={PermissionAction.fetch_documents} a={currentPerspective} ability={ability}>
  <Button>…</Button>
</Can>
```

**Server side (API route) — always required:**

```ts
const session = await getServerSession(authOptions)
const ability = abilityFromAuthzContext(session.user.authz)
const canFetch = ability.can(PermissionAction.fetch_documents, targetPerson)
if (!canFetch) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

> Client-side `<Can>` checks are for UX only. Always re-check authorization on the server.

## Internationalisation (i18n)

Translations are managed with [LinguiJS](https://lingui.js.org/). Source `.po` files live under `src/locales/`.

### Workflow

1. **Extract** — after adding or changing user-facing strings in the code, update the `.po` files:
   ```bash
   npm run i18n:extract
   ```
2. **Translate** — edit the `.po` files directly or via a tool such as Poeditor.
3. **Compile** — generate the optimised JS catalogs consumed at runtime:
   ```bash
   npm run i18n:compile
   ```

Both steps run automatically inside the Docker build (`npm run i18n:extract && npm run i18n:compile` in the Dockerfile).

> **Never add new entries to `.po` files manually.** New message keys must always come from `i18n:extract` — run it after editing `.tsx`/`.ts` files and check the git diff to see what was added. You may then fill in the `msgstr` translations for the newly extracted entries.
>
> **Never edit `.js` locale files directly** (`src/locales/*/messages.js`). They are generated by `i18n:compile` and any manual changes will be overwritten.
>
> **Avoid dynamic `id` expressions on `<Trans>`.** The extractor only sees static string literals. This pattern is **not** extracted:
>
> ```tsx
> <Trans
>   id={
>     ownPerspective
>       ? 'profile_identifiers_card_title'
>       : 'profile_identifiers_card_title_other'
>   }
> />
> ```
>
> Replace it with two static calls:
>
> ```tsx
> {
>   ownPerspective ? (
>     <Trans id='profile_identifiers_card_title' />
>   ) : (
>     <Trans id='profile_identifiers_card_title_other' />
>   )
> }
> ```

### Accessing the current locale on the client

The locale flows through three layers:

1. **Server** — `src/app/[lang]/layout.tsx` resolves the `[lang]` URL segment via `resolveLanguage()`, which picks the matching message catalog (falls back to `en`).
2. **Initialisation** — `LanguageProvider` (`src/app/[lang]/LanguageProvider.tsx`) is a client component that calls `i18n.load(locale, messages)` then `i18n.activate(locale)` on the LinguiJS singleton, making the locale available to the entire subtree.
3. **Consumption** — two equivalent patterns in client components:
   - Direct singleton read (most common): `import * as Lingui from '@lingui/core'` → `Lingui.i18n.locale`
   - Hook form (re-renders on locale change): `import { useLingui } from '@lingui/react'` → `const { i18n } = useLingui()`

## Database migrations

Migrations are generated by Prisma from schema changes — never write migration SQL files by hand.

### Workflow

1. Edit `prisma/schema.prisma`.
2. Generate the migration file:
   ```bash
   npx prisma migrate dev --name <short_description>
   ```
   Prisma diffs the schema, writes the SQL file under `prisma/migrations/`, and applies it to the local database.
3. Commit both the updated `schema.prisma` and the generated migration file.

> **Before running any migration command**, check that the local database is reachable on port 5432 (`pg_isready -p 5432` or `docker ps | grep postgres`). If it is not running, ask the user to start it — either as a Docker container or a local PostgreSQL instance — do not start it yourself.

## Testing

There are two kinds of tests.

### Unit tests

Unit tests are co-located with the source files they cover, following the `*.test.ts` / `*.test.tsx` naming convention. They run with Jest and use mocks for all external dependencies (fetch, Prisma, third-party APIs).

```bash
npm run test
```

Examples: `src/app/lib/services/VocabSearchClient.test.ts`, `src/app/lib/websocket/WebSocketListener.test.tsx`.

### Integration tests

Integration tests live under `tests/` and mirror the `src/` directory structure. They run against a real PostgreSQL database (not mocks) and exercise the full stack from service to DAO to database. They require a separate test database:

```bash
docker run -it --rm --name postgres_test_service \
  -e POSTGRES_USER=sovisuplus_test \
  -e POSTGRES_PASSWORD=sovisuplus_test \
  -e POSTGRES_DB=sovisuplus_test \
  -p 5433:5432 postgres:latest
```

```bash
npm run test:integration
```

> **Before running integration tests**, check that the test database container is up (`docker ps | grep postgres_test_service`). If it is not running, ask the user to start it — do not start it yourself.

Examples: `tests/app/lib/services/PersonService.test.ts`, `tests/app/lib/daos/PersonDAO.test.ts`, `tests/prisma/PersonIdentifier.test.ts`.
