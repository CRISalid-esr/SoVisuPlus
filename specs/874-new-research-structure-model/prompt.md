# New research structure model

GitHub issue: [CRISalid-esr/SoVisuPlus#874](https://github.com/CRISalid-esr/SoVisuPlus/issues/874)
Upstream IKG issue: [crisalid-ikg#373](https://github.com/CRISalid-esr/crisalid-ikg/issues/373)
(spec: `crisalid-ikg/specs/new-research-structure-model#373/prompt.md`)

## Goal

The institutional knowledge graph (IKG) no longer models only research units.
It now ingests **all kinds of organization structures** — institutions,
institution subdivisions, units of several missions, unit subdivisions, teams —
together with the **relationships between them** (`PART_OF` inclusions and
`MEMBER_OF` supervision/affiliation links).

SoVisuPlus must follow:

1. **Generalize the `ResearchUnit` model** into an `OrganizationUnit` model
   covering the full typology, including organization-to-organization
   relationships.
2. **Rework message processing**: structure events no longer carry everything
   we need (notably the concrete unit type); the worker must fetch the full
   structure from the **Apollo GraphQL API**, exactly as `PersonWorker` does
   for people.
3. **Replace the two-entry perspective switcher** (Researchers / Research
   units) with a **five-entry menu**: Researchers, Institutions, Research
   units, Other structures, Teams.
4. Prepare the ground (relationships, employments) for a later issue: a page to
   **navigate the organizational tree** and open unit dashboards from it.

The aim is **not** to copy the whole graph exhaustively — only what the
application needs for perspectives, dashboards, and the future tree navigation.

**No data migration is required: the database will be wiped.**

## Decisions (validated 2026-07-13)

| Question                                 | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu mapping                             | **Five groups** (updated 2026-07-14): Researchers / Institutions / Research units / Other structures / Teams. "Research units" = units whose concrete graph type is `ResearchUnit` (main_mission = research). "Teams" = generic_type `team` (national types `TEAM`, `THEME`). "Other structures" = institution subdivisions and unit subdivisions. **Support / administrative / teaching units are imported but do not appear in the perspective menu**: they are needed to display the organizational tree — they often have research units or institution subdivisions as children — but are not selectable perspectives.       |
| External structures (`external = true`)  | **Store them, hide them from the perspective menu.** They are needed as relationship targets for the future tree page but have no displayable labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Institution / other-structure dashboards | **One-hop expansion through org relationships** (updated 2026-07-14, supersedes the earlier "identity only" decision). Publication data per perspective group: **institutions** → documents of the members of the **research units** that are `member_of` the institution (any supervision position; no direct institution memberships, no employments until they exist); **institution subdivisions** (and unit subdivisions) → documents of their **direct members plus** the members of the units that are `member_of` **or** `part_of` the subdivision; **research units** and **teams** → documents of their direct members. |
| Employments                              | **Model now.** Add an `Employment` table and hydrate `employmentsConnection` (already fetched by `person.graphql`, currently dropped by `PersonGraphQLClient.hydrate`).                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Authorization scopes                     | **Same one-hop expansion as the dashboards** (added 2026-07-14). Role scopes can target all four organization types: `Institution`, `ResearchUnit`, `InstitutionDivision` (institution & unit subdivisions), and a new `Team` entity type. A scope matches the people (and the documents of the people) in the organization's dashboard perimeter: institution → members of research units `member_of` it; subdivision → direct members + members of units `member_of`/`part_of` it; research unit / team → direct members. Employments still play no role.                                                                       |

---

## Background — what the graph and the API now provide

### Graph model (IKG)

Every structure is a Neo4j node labelled `OrganizationUnit` plus concrete
labels describing its type:

```
OrganizationUnit
├── Institution                (generic_type = institution)
├── InstitutionSubdivision     (generic_type = institution_subdivision)
├── Unit                       (generic_type = unit) — plus one of:
│   ├── ResearchUnit           (main_mission = research)
│   ├── SupportUnit            (main_mission = scientific_services)
│   ├── AdministrativeUnit     (main_mission = administrative_services)
│   └── TeachingUnit           (main_mission = teaching)
├── UnitSubdivision            (generic_type = unit_subdivision)
└── Team                       (generic_type = team)
```

Structure-to-structure relationships, always child → parent:

- `PART_OF` — strong inclusion (team inside a unit, institution inside an EPE…),
  properties `start_date`, `end_date`.
- `MEMBER_OF` — weak membership (unit supervised by an institution, team
  affiliated to a subdivision…), properties `start_date`, `end_date`,
  `position` (`main_supervision` / `associated_supervision` /
  `participating_supervision` — only meaningful for Institution ← Unit).

Structures carry `external: bool` — `true` when the node was auto-created from
the national registry because it appeared as a relationship target (uids like
`uai-…`, `ror-…`), `false` when sourced from the institutional directory
(`local-…` uids). External nodes typically have **no labels**.

### Apollo GraphQL API (`http://localhost:4000/graphql` in dev)

```graphql
type OrganizationUnit @node {
  uid: ID!
  external: Boolean
  generic_type: String!
  national_type: String
  long_labels: [Literal!]! # HAS_LONG_LABEL
  short_labels: [Literal!]! # HAS_SHORT_LABEL
  local_types: [Literal!]! # HAS_LOCAL_TYPE
  descriptions: [TextLiteral!]! # HAS_DESCRIPTION
  identifiers: [AgentIdentifier!]!
  member_of: [OrganizationUnit!]! # properties: OrgMembership (position, start_date, end_date)
  part_of: [OrganizationUnit!]! # properties: OrgInclusion (start_date, end_date)
  types: [String!]! # Neo4j labels, e.g. ["OrganizationUnit","Unit","ResearchUnit"]
}
```

`Person` exposes both `memberships` (`MEMBER_OF`, properties `start_date`,
`end_date`, `position_code`) and `employments` (`EMPLOYED_AT`, same
properties) toward `OrganizationUnit`.

Relationship properties are reached through the connection form, e.g.
`member_ofConnection { edges { node { uid } properties { position start_date end_date } } }`.

> **Known Apollo gaps (upstream warnings, do not block this issue):**
>
> - `main_mission` / `secondary_missions` are **not** exposed as fields. The
>   concrete unit type must be derived from the `types` label array
>   (`ResearchUnit`, `SupportUnit`, …), which carries the same information.
> - `contacts` (postal / electronic addresses) and `hal_collection` are not
>   exposed at all. Neither is currently stored by SoVisuPlus, so nothing is
>   lost — but the future tree/dashboard work may require an Apollo schema
>   extension.
> - The IKG does **not publish AMQP events for external registry-created
>   institutions** — they only reach SoVisuPlus as `member_of` / `part_of`
>   targets of other structures (see "shallow upsert" below).

### New AMQP structure events

SoVisuPlus consumes the IKG's `graph` exchange with bindings
`event.structures.structure.*` (`src/app/lib/amqp/AmqpConnection.ts:22,31`).
The IKG structure event factories now emit:

```jsonc
{
  "type": "unit", // generic_type: institution | institution_subdivision | unit | unit_subdivision | team
  "event": "created", // created | updated | deleted | unchanged
  "fields": {
    "uid": "local-CENTER-001",
    "national_type": "UMR", // may be null; managed national list (UNIV, EPE, UMR, UAR, UFR, …), evolves over time
    "local_types": [{ "value": "Centre", "language": "fr" }],
    "identifiers": [{ "type": "local", "value": "CENTER-001" }],
    "long_labels": [{ "value": "…", "language": "fr" }],
    "short_labels": [{ "value": "…", "language": "fr" }],
    "descriptions": [{ "value": "…", "language": "fr" }],
    "memberships": [
      {
        "target": "local-UP1",
        "position": "main_supervision",
        "start_date": "2000-01-01",
        "end_date": null,
      },
    ],
    "parents": [
      { "target": "local-DGB", "start_date": null, "end_date": null },
    ],
    "addresses": [],
    "electronical_addresses": [],
    "main_mission": "research", // units only
    "secondary_missions": [], // units only
  },
}
```

The payload is richer than before but the processing model changes anyway: as
for people, **the message is treated as a trigger** and the authoritative data
(including the concrete type via labels) is fetched from Apollo by `uid`.

---

## Current behaviour (to be replaced)

- `isResearchUnitMessage` (`src/app/lib/amqp/utils/typeGuards.ts:12-16`) only
  accepts `type === 'unit' && fields.main_mission === 'research'` — every other
  structure event is **silently dropped**.
- `ResearchUnitWorker` (`src/app/lib/amqp/workers/ResearchUnitWorker.ts`) maps
  message fields directly (uid, labels, identifiers; `acronym` = first short
  label) and upserts through `ResearchUnitDAO`. No GraphQL call, no
  relationships, `national_type` / `main_mission` ignored.
- Prisma `ResearchUnit` (schema lines ~536-593): `uid`, `acronym`, `signature`,
  `external`, `slug`, with `ResearchUnitName` (one per language),
  `ResearchUnitDescription`, `ResearchUnitIdentifier`. No type field, no
  self-relations, no institution link.
- `Person` ↔ `ResearchUnit` via `Membership` (`personId`, `researchUnitId`,
  dates, `positionCode`). No employment model.
- `PersonGraphQLClient.hydrate` maps `membershipsConnection` only;
  `employmentsConnection` is fetched by `person.graphql` and **dropped**.
- UI perspective: `SearchInput` has two hardcoded tags (people /
  researchUnits); `userSlice.setPerspectiveBySlug` branches on the
  `person:` / `research-unit:` slug prefixes; dashboards dispatch on
  `IAgent.type` (`'person' | 'research_unit' | 'institution'`).

---

## Target design

### 1. Prisma schema — `OrganizationUnit` replaces `ResearchUnit`

Rename and generalize the cluster (fresh migration; the `AuthorityOrganization`
cluster used for document affiliations is **unchanged** and stays separate):

```prisma
enum OrganizationGenericType {
  institution
  institution_subdivision
  unit
  unit_subdivision
  team
}

// Concrete category, derived from the graph labels at sync time.
enum OrganizationCategory {
  institution
  institution_subdivision
  research_unit
  support_unit
  administrative_unit
  teaching_unit
  unit_subdivision
  team
}

model OrganizationUnit {
  id           Int                     @id @default(autoincrement())
  uid          String                  @unique
  genericType  OrganizationGenericType
  category     OrganizationCategory
  nationalType String?                 // open national list — keep as String, it evolves upstream
  external     Boolean                 @default(false)
  acronym      String?                 // first short label, as today
  slug         String?                 @unique

  labels        OrganizationUnitLabel[]
  descriptions  OrganizationUnitDescription[]
  identifiers   OrganizationUnitIdentifier[]
  localTypes    Json?                  // [{ value, language }] — display only

  parents   OrganizationRelationship[] @relation("child")
  children  OrganizationRelationship[] @relation("parent")

  memberships  Membership[]
  employments  Employment[]
}

enum OrganizationLabelKind {
  short
  long
}

model OrganizationUnitLabel {
  id                 Int                   @id @default(autoincrement())
  organizationUnitId Int
  kind               OrganizationLabelKind
  language           String
  value              String                @db.VarChar(255)
  @@unique([organizationUnitId, kind, language])
}
```

- `OrganizationUnitDescription` and `OrganizationUnitIdentifier` are the
  current `ResearchUnitDescription` / `ResearchUnitIdentifier` renamed
  (`ResearchUnitIdentifierType` → `OrganizationIdentifierType`, same values).
- `signature` is dropped (it was always written as `null`).

Organization-to-organization relationships, mirroring the graph (child →
parent):

```prisma
enum OrganizationRelationKind {
  part_of
  member_of
}

model OrganizationRelationship {
  id           Int                      @id @default(autoincrement())
  childId      Int
  parentId     Int
  kind         OrganizationRelationKind
  position     String?                  // main_supervision | associated_supervision | participating_supervision
  startDate    DateTime?
  endDate      DateTime?

  child  OrganizationUnit @relation("child", fields: [childId], references: [id], onDelete: Cascade)
  parent OrganizationUnit @relation("parent", fields: [parentId], references: [id], onDelete: Cascade)

  @@unique([childId, parentId, kind])
  @@index([parentId])
}
```

Person links:

- `Membership`: rename `researchUnitId` → `organizationUnitId` (semantics
  unchanged — `MEMBER_OF` from the person workflow).
- **New** `Employment`: same shape as `Membership` (`personId`,
  `organizationUnitId`, `startDate?`, `endDate?`, `positionCode?`, unique
  `[personId, organizationUnitId]`) — `EMPLOYED_AT` from the person workflow.

Composite types in `prisma/extended-client.ts` follow (derive them from the
query includes with `Prisma.…GetPayload`, per the CLAUDE.md guideline).

### 2. Message processing — fetch from Apollo like people

**Type guard** (`typeGuards.ts`): replace `isResearchUnitMessage` with

```ts
const ORGANIZATION_MESSAGE_TYPES = [
  'institution',
  'institution_subdivision',
  'unit',
  'unit_subdivision',
  'team',
] as const

export const isOrganizationUnitMessage = (
  msg: AMQPMessage,
): msg is AMQPOrganizationUnitMessage =>
  (ORGANIZATION_MESSAGE_TYPES as readonly string[]).includes(msg.type)
```

The `main_mission === 'research'` gate disappears. AMQP types:
`AMQPResearchUnitData` / `AMQPResearchUnitMessage` become
`AMQPOrganizationUnitData` / `AMQPOrganizationUnitMessage` (type union above,
`event: 'created' | 'updated' | 'deleted' | 'unchanged'`). Only `fields.uid`
is actually consumed.

**New `OrganizationUnitGraphQLClient`** (`src/app/lib/graphql/`), modeled on
`PersonGraphQLClient`, with a query file
`src/app/lib/graphql/queries/organizationUnit.graphql`:

```graphql
query OrganizationUnitsQuery($where: OrganizationUnitWhere) {
  organizationUnits(where: $where) {
    uid
    external
    generic_type
    national_type
    types
    long_labels {
      value
      language
    }
    short_labels {
      value
      language
    }
    local_types {
      value
      language
    }
    descriptions {
      value
      language
    }
    identifiers {
      type
      value
    }
    member_ofConnection {
      edges {
        node {
          uid
          external
          generic_type
          national_type
          types
          short_labels {
            value
            language
          }
          long_labels {
            value
            language
          }
        }
        properties {
          position
          start_date
          end_date
        }
      }
    }
    part_ofConnection {
      edges {
        node {
          uid
          external
          generic_type
          national_type
          types
          short_labels {
            value
            language
          }
          long_labels {
            value
            language
          }
        }
        properties {
          start_date
          end_date
        }
      }
    }
  }
}
```

(filter form: `{ uid_EQ: $uid }`.)

The client hydrates a domain `OrganizationUnit`, deriving `category` from the
`types` label array: `ResearchUnit` → `research_unit`, `SupportUnit` →
`support_unit`, `AdministrativeUnit` → `administrative_unit`, `TeachingUnit` →
`teaching_unit`, else map from `generic_type`. Unknown label combinations must
log an error and fall back to the `generic_type` mapping.

**`OrganizationUnitWorker`** replaces `ResearchUnitWorker`:

1. `created` / `updated` / `unchanged` → fetch the structure from Apollo by
   `fields.uid`, upsert via `OrganizationUnitDAO`. (Same create-or-update for
   all three events: earlier messages may have been missed.)
2. `deleted` → log and ignore. The IKG does not delete organization nodes for
   now; structure lifecycle is a later issue.
3. If the Apollo fetch returns nothing, log an error and skip (do not fall back
   to the message payload — partial rows would lack `category`).

**Upsert semantics** (`OrganizationUnitDAO.createOrUpdateOrganizationUnit`):

- Node fields, labels, descriptions, identifiers, localTypes: incoming data is
  authoritative — replace (delete-and-recreate identifiers as today; upsert
  labels/descriptions by `[kind, language]`, delete entries absent from the
  message).
- Relationships (`parents` = the structure's `part_of` + `member_of` edges):
  replace all `OrganizationRelationship` rows where `childId` = this structure.
  Rows where it is the **parent** are untouched (they belong to the children's
  own sync).
- **Shallow upsert of relationship targets**: for each `member_of` / `part_of`
  edge, if the parent uid is not yet in Postgres, create it from the node data
  returned by Apollo (uid, genericType, category, nationalType, external,
  labels → acronym/slug). If it already exists, do **not** overwrite it (its
  own message/sync owns its data). This solves both out-of-order message
  arrival and external registry institutions, which never get their own AMQP
  event.
- Person-side rows (`Membership`, `Employment`) are never touched by structure
  sync.

Slug generation: keep the current collision-retry mechanism, with a single
`org:` prefix for all organization units (see §4).

### 3. Domain types

- `src/app/types/OrganizationUnit.ts` replaces `ResearchUnit.ts`. Same
  `IAgent` implementation, plus `genericType`, `category`, `nationalType`,
  `external`, `localTypes`, and reified relationships
  (`parents: OrganizationRelation[]` with `{ parent, kind, position?, startDate?, endDate? }`).
- **Type display rule**: for display purposes, the **local type always takes
  precedence over the national type** — e.g. a subdivision with national type
  `EUR` and local type "graduate school" displays "graduate school". The
  national type may appear **secondarily** when there is enough space. The
  generic type is **never displayed**: `generic_type` and the missions are
  pure classification tags mapping the data onto the _cadre de référence_
  (the new French standard). The domain class provides a
  `getDisplayType(locale)` helper: first `localTypes` literal matching the
  current locale (fallback to any language), else `nationalType`, else `null`.
- **National types are never displayed raw** (added 2026-07-14): local types
  are multilingual data from the graph and display as-is, but national types
  are vocabulary codes (`UNIV`, `UMR`, `THEME`, …) translated through the UI
  catalog. `organizationTypeLabels.ts` holds one static Lingui `msg` entry
  per known code (the extractor cannot see dynamic ids); unknown codes —
  the national list evolves upstream — fall back to the raw code until a
  translation is added.
- `IAgent.ts`: `AgentType` becomes the five perspective groups:

  ```ts
  type AgentType =
    | 'person'
    | 'institution'
    | 'research_unit'
    | 'other_structure'
    | 'team'
  ```

  `OrganizationUnit.type` derives the group from `category`:
  `institution` → `'institution'`, `research_unit` → `'research_unit'`,
  `team` → `'team'`, everything else → `'other_structure'`. (Support /
  administrative / teaching units also map to `'other_structure'` if ever
  rendered, but they are excluded from perspective search — see §4.)

- `PersonMembership.researchUnit` → `organizationUnit`; new `PersonEmployment`
  (same shape). `Person` gains `employments: PersonEmployment[]`;
  `PersonGraphQLClient.hydrate` maps `employmentsConnection` the same way it
  maps memberships (and switches from the stale singular `type` field to the
  `types` array for organization nodes).
- **Authorization perimeters** (updated 2026-07-14): role scopes use the same
  one-hop expansion as the dashboard perimeters, for all four organization
  entity types. `Person.authzProperties.perimeter` and
  `Document.computeScope` publish, from the person's / the contributors'
  memberships (including the membership organizations' `parents`
  relationships, which the DAO includes must fetch):
  - `ResearchUnit`: uids of research units the person is a direct member of;
  - `Team`: uids of teams the person is a direct member of (**new
    `EntityType.Team`** enum value — migration required);
  - `Institution`: uids of the institutions that the person's research units
    are `member_of` (any supervision position);
  - `InstitutionDivision`: uids of institution/unit subdivisions the person
    is a direct member of, plus subdivisions that any of their membership
    organizations are `member_of` or `part_of`.

  A scope `Institution:<uid>` therefore matches the members of the
  institution's supervised research units, and the documents having at least
  one such contributor — consistent with what the institution dashboard
  displays. Employments feed no perimeter. `PermissionSubject` is unchanged.
  A shared helper (`src/app/types/organizationScopes.ts`) implements the
  membership → perimeter mapping for both `Person` and `Document`.

### 4. API routes, services, stores

- `/api/researchUnits` → `/api/organizations`:
  `GET /api/organizations?searchTerm=&group=&page=&itemsPerPage=` where
  `group` ∈ `institution | research_unit | other_structure | team` maps to a
  `category` filter (`other_structure` = `institution_subdivision`,
  `unit_subdivision`; `team` = `team`). **Always excludes `external = true`
  rows**, and support / administrative / teaching units are not reachable
  through any group — they are stored for the organizational tree only.
- `/api/researchUnits/slug/[slug]` → `/api/organizations/slug/[slug]`.
- `ResearchUnitService` / `ResearchUnitDAO` → `OrganizationUnitService` /
  `OrganizationUnitDAO` (search by label value, filtered by group + external).
- `researchUnitSlice` → `organizationUnitSlice`: state keyed by group so the
  three organization tags can search independently
  (`fetchOrganizationsByName(searchTerm, group)`).
- `userSlice.setPerspectiveBySlug`: slug prefixes become `person:` and `org:`
  (single organization endpoint; the returned entity carries its own group).
  `refreshPerspective` must refresh organization perspectives too, not only
  Person ones.
- `DocumentService.buildContributorUidArray`: `person` unchanged; the four
  organization groups expand to person uids through
  `PersonDAO.fetchPeopleByOrganizationPerimeter(uid, group)`:
  - `research_unit`, `team` → people with a direct membership to the org;
  - `institution` → people who are members of a **research unit** that is
    `member_of` the institution (any position, one hop). Direct institution
    memberships and employments are **not** used (employments don't exist
    yet);
  - `other_structure` (institution & unit subdivisions) → people with a
    direct membership to the subdivision, **plus** members of any unit that
    is `member_of` or `part_of` it (one hop).

  Deeper recursion through the tree stays out of scope for this issue.

- `/api/documents/dataviz` and `/api/wordstream` accept the new `AgentType`
  values.

### 5. UI — four-entry perspective menu

`SearchInput` (`src/app/[lang]/components/SearchInput/SearchInput.tsx`):

- Five tags / option groups: **Researchers**, **Institutions**, **Research
  units**, **Other structures**, **Teams** (i18n keys via Lingui; run
  `i18n:extract`, never hand-add `.po` entries; fr + en translations).
- People search unchanged; the four organization tags call the organizations
  endpoint with their `group`.
- Teams — like many non-research structures — will later have direct person
  members; today they have none, so their dashboards render empty document
  widgets (the direct-membership expansion of §4 already covers them once the
  data arrives). Sample teams exist in the dev graph (`local-U029_T1`,
  `local-U029_T2` with national type `THEME` / local type "Axe";
  `local-DS64_T1` with national type `TEAM` / local type "Département").
- Selection still pushes `?perspective=<slug>` — slugs are `person:…` or
  `org:…`.

Dashboard: `AgentIdentityCard` dispatches `isPerson` → `PersonIdentityCard`,
else → `OrganizationUnitIdentityCard` (generalized from
`ResearchUnitIdentityCard`: labels, acronym, identifiers, descriptions, and a
type chip following the display rule of §3 — **local type first, national type
as a secondary mention when space allows, never the generic type**). No other
dashboard change: identity works for all groups; document widgets show the
publications of the perspective's perimeter as defined in §4 (one-hop
expansion for institutions and subdivisions, direct members otherwise) and
render empty when that perimeter holds no one.

### 6. Out of scope (later issues)

- Organizational **tree navigation page** (will use the
  `OrganizationRelationship` rows stored here).
- **Recursive roll-up** deeper than one hop (dashboards and scopes both stop
  at the direct organization relationships).
- Structure **lifecycle** (`deleted` events, end dates).
- **Contacts / hal_collection / research areas** (not exposed by Apollo yet).
- **Employment-based** perimeters (dashboards and authorization) — waiting for
  employment data to exist.

---

## Testing

- Unit tests (co-located, Jest, mocked): `OrganizationUnitWorker` (each event
  type, Apollo-fetch-empty case, non-research units no longer dropped),
  `MessageProcessingWorkerFactory` routing for the five structure types,
  `OrganizationUnitGraphQLClient.hydrate` (category derivation from labels,
  relationship properties, external targets), `PersonGraphQLClient` employment
  hydration, `OrganizationUnit` domain class (group derivation, display name),
  `organizationUnitSlice`, `userSlice` slug handling.
- Integration tests (`tests/`, real PostgreSQL):
  `OrganizationUnitDAO` (upsert, authoritative replace of
  labels/identifiers/relationships, shallow-upsert of missing parents,
  no-overwrite of existing parents, search filtered by group/external),
  `PersonDAO` membership + employment upserts.
- Existing `ResearchUnit*` tests are renamed/absorbed accordingly.
