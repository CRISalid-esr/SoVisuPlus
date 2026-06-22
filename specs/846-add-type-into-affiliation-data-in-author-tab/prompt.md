## Context

Add an organization **type** to affiliations and surface it on the document **Authors** tab,
where each contributor's affiliations are displayed and edited. An affiliation is an
`AuthorityOrganization` (e.g. a laboratory, an institution); until now it carried only its
display names, places and identifiers. This feature stores the type in our database, carries
it through the graph round-trip, and lets a user view and edit it per affiliation.

Mockups are at `[mockups path]/src/app/[lang]/documents/[uid]/components/Authors/Authors.tsx`
(mockups path in `CLAUDE.local.md`). Use the mockup only for layout/visual details — never
for types, data formats or interaction logic.

> This spec is consolidated: each behaviour is described once, in its final intended state.

## Two type vocabularies

The feature deliberately uses two distinct vocabularies, bridged by a mapping:

- **Database / graph** — the Prisma enum `AuthorityOrganizationType`:
  `organization`, `research_team_group`, `laboratory`, `research_team`, `institution`,
  `laboratory_group`, `institution_group`. Stored on `AuthorityOrganization`.
- **HAL / UI** — the 5 values the Authors-tab select exposes, in this **display order**:
  `institution`, `department`, `regrouplaboratory`, `laboratory`, `researchteam`.
  These are HAL `type_s` values; the select, the read-only chip and the suggestion chip all
  use this vocabulary.

**DB → HAL mapping** (used only to pick the select's _default_ value):
`institution → institution`, `laboratory → laboratory`, `research_team → researchteam`.
Every other DB value (`organization`, `institution_group`, `laboratory_group`,
`research_team_group`) has **no default** → the select shows empty / "None".

**Save → graph**: the value sent back is the **HAL string** verbatim (the contribution save
payload is entirely HAL-shaped; the graph maps it on its side). There is no reverse
HAL → DB mapping in the app.

## Database & domain

- Prisma: add the `AuthorityOrganizationType` enum and a **nullable** `type` column on the
  `AuthorityOrganization` model; generate and apply the migration.
- Domain `AuthorityOrganization` (`src/app/types/AuthorityOrganization.ts`): add a
  `type: AuthorityOrganizationType | null` field (constructor + `AuthorityOrganizationJson`).
  A static `authorityOrganizationTypeFromString(string | null)` validates a raw string
  against the enum and returns it, or `null` when absent/unknown (handles the null itself,
  no caller-side ternary). `fromJson` and `fromDb` populate `type`.
- DAO `AuthorityOrganizationDAO.createOrUpdateAuthorityOrganization` writes `type` in both
  the create and update branches.
- GraphQL: the document query (`document.graphql`) selects `type` on `affiliations`;
  `DocumentGraphQLClient` hydrates it via `authorityOrganizationTypeFromString(org.type)`.

## Authors tab — client model

The tab edits a client-side `WorkingAffiliation` (flat HAL-style fields). Add
`type: HalAffiliationType | null` to it, where `HalAffiliationType` is the 5-value union.

A small dedicated helper module (`Authors/lib/affiliationType.ts`) owns the vocabulary and
mappings (kept free of i18n so it is unit-testable):

- `HAL_AFFILIATION_TYPES` — the 5 values **in display order** (drives select options and
  chips); `HalAffiliationType` = its element union.
- `dbTypeToHal(AuthorityOrganizationType | null): HalAffiliationType | null` — the 3 mapped
  values, else `null`.
- `normalizeHalType(string | null | undefined): HalAffiliationType | null` — returns the
  value iff it is one of the 5 (trim + lower-case), else `null`.

Translated labels live in a separate render-time helper (`Authors/lib/affiliationTypeLabels.ts`)
with one **static** `t` literal per value (so LinguiJS extracts them; no dynamic ids).

Mapping points:

- Loading a baseline affiliation (`affiliationFromAuthorityOrganization` in
  `contributionDiff.ts`): `type = dbTypeToHal(org.type)`.
- Adding/suggesting via HAL (`halStructureToAffiliation` in `halMapping.ts`):
  `type = normalizeHalType(doc.type_s)`. `type_s` is already on `AureHalStructureDoc` and
  `searchStructures` already requests `fl=*`, so no HAL API-call change is needed.
- Editing: `useContributionsEditor` exposes `setAffiliationType(localId, affiliationLocalId,
type)` (same shape as `removeAffiliation`), prop-drilled
  `ContributorList → ContributionCard → AffiliationPanel → AffiliationCard` as
  `onChangeAffiliationType` / `onChangeType`.

## Authors tab — display

**AffiliationCard (identified card).** The type control sits on the **same row as the name**,
`justifyContent='space-between'` (name group left, type control right):

- **Editable** (`!readOnly`): a compact MUI `TextField select` (`size='small'`,
  `minWidth: 150`) with breathing room around it (`ml: 2`, `mr: 5`, `mb: 1`); `mr` also
  keeps it clear of the absolute delete (bin) icon at the card's top-right. Value =
  `affiliation.type ?? ''` with a leading empty **"None"** option, then the 5 HAL values in
  display order with translated labels. Disabled when `disabled`. Changing it updates the
  working state and (because the type is in the save payload) marks the tab dirty → UPDATE.
- **Read-only**: do **not** render the select. Instead, when `affiliation.type` is non-null
  (i.e. it maps to a HAL value), show a read-only `Chip` with the translated label; render
  nothing when there is no mappable type.

**Affiliation suggestion card** (`AffiliationSuggestions` / `SuggestionBox`): show the type as
a read-only `Chip` next to the name, label = `halAffiliationTypeLabel(normalizeHalType(
doc.type_s))`; render nothing when it normalizes to `null`. No select here.

## Save

`ContributionActionAffiliation` gains `type: string | null`; `toAffiliationPayload` sets
`type: aff.type`. The value is the HAL string. It flows into the normalized diff, so editing
the type alone is a detectable change. Everything else about the contribution save path is
unchanged.

## Translations

Order = select option order = chip order.

| HAL value           | English               | French                       |
| ------------------- | --------------------- | ---------------------------- |
| `institution`       | Institution           | Institution                  |
| `department`        | Department            | Département                  |
| `regrouplaboratory` | Group of laboratories | Regroupement de laboratoires |
| `laboratory`        | Laboratory            | Laboratoire                  |
| `researchteam`      | Research Team         | Equipe de recherche          |

Select label = "Type" (EN/FR); empty option = "None" / "Aucun". Add the keys via
`i18n:extract`, fill `en`/`fr` `msgstr`, then `i18n:compile` (never hand-edit `.po` entries
manually beyond filling translations, never edit compiled `.js`).

## Tests

- Unit-test `affiliationType.ts` (`dbTypeToHal`, `normalizeHalType`).
- `contributionDiff.test.ts`: DB type maps to the HAL default; a type change appears in the
  action payload as an UPDATE.
- `halMapping.test.ts`: `halStructureToAffiliation` maps a known `type_s` and drops unknown.
- Keep the DAO/GraphQL/domain tests in sync with the new field (constructor arity, fixtures,
  expected create/update `data`).

## Out of scope

Dashboard OA-per-year stats (`DocumentDAO.fetchOAYearDocuments` /
`DocumentService.documentsPerYear`) — not part of the Authors tab feature.
