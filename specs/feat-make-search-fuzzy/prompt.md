# Fuzzy search — sidebar, documents list and research structures

## Intent

Every search input matched plain substrings (`contains` + `mode: insensitive`, i.e.
`ILIKE '%term%'`), with inconsistent accent handling and no ranking. A typo ("Dupond"),
a missing accent in a structure name ("universite"), or words typed in another order
returned nothing, and results came in arbitrary order (people by last name, structures by
label count).

This branch makes search **typo-tolerant, case-, accent- and word-order-insensitive**, and
ranks results by relevance where the list has no user-chosen order.

## Scope

| Search                                                                 | Where it runs                           | Ranking                            |
| ---------------------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| Sidebar people search                                                  | PostgreSQL (`pg_trgm`)                  | yes                                |
| Sidebar structures search (per perspective group)                      | PostgreSQL (`pg_trgm`)                  | yes                                |
| Documents list: global search + title / contributors / journal filters | PostgreSQL (typo variants + `contains`) | no — the table has its own sorting |
| Research structures: tree search, flat and tree tables                 | Browser (TS scorer)                     | tables: yes (MRT ranked results)   |
| Research structures: detail panel members table                        | Node, in memory (TS scorer)             | only under the default name sort   |

Out of scope: HAL / AureHAL autocompletes and vocabulary search (external services), the
document Sources tab, static option autocompletes.

## Decisions

| Question                     | Decision                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normalization                | Once, in TS: `normalizeSearchText` = `removeAccents` + lowercase, shared by browser and server                                                                                                                                                             |
| Server storage               | Search-only `normalized*` columns next to the originals (data and UI keep accents), GIN `gin_trgm_ops`                                                                                                                                                     |
| PostgreSQL extension         | `pg_trgm` only (trusted extension; no `unaccent`, which is not IMMUTABLE and cannot be indexed via Prisma)                                                                                                                                                 |
| Word semantics               | Every query word must match (AND), in any order                                                                                                                                                                                                            |
| Typo threshold (server)      | `pg_trgm.word_similarity_threshold` 0.6 for names; 0.5 for document typo-variant lookup                                                                                                                                                                    |
| Short words                  | < 3 letters: substring only; documents list ignores them when longer words exist                                                                                                                                                                           |
| Word limits                  | 6 words for names, 30 for the documents list (a pasted title), each word cut at 100 characters                                                                                                                                                             |
| Documents: abstracts         | **No longer searched** — the UI never shows them; their normalized column was dropped                                                                                                                                                                      |
| Documents: expanded words    | Only likely typos: a word found as such in the data gets no variants ("economie" ≠ "economics")                                                                                                                                                            |
| External / hidden structures | Still excluded from the sidebar search (unchanged); the structures page toggles work on client-side data                                                                                                                                                   |
| Highlighting                 | Fuzzy chunks (typos highlight the whole word, accents map back to original characters)                                                                                                                                                                     |
| Search length (API, 400)     | 200 characters for name searches (people, structures, members, documents contributors and journal filters), 500 for the documents global search and title filter; same `maxLength` on every search field, including the client-side structures page fields |
| Session check on search API  | **Deferred** to a dedicated branch after this one                                                                                                                                                                                                          |

## Design

### Shared module — `src/app/utils/fuzzySearch/`

- `constants.ts` — every threshold and limit above.
- `fuzzySearch.ts` (pure, browser + server):
  - `normalizeSearchText`, `tokenizeSearchQuery(query, maxTokens)`,
    `tokenizeDocumentSearchQuery` (30 words, short words dropped).
  - `fuzzyScore` / `fuzzyMatch`: per word, 1 whole word, 0.9 word prefix, 0.8 substring,
    then (≥ 4 letters) optimal string alignment distance ≤ 1 (≤ 2 from 7 letters), a typo
    in a word still being typed, or trigram similarity ≥ 0.5. Mean over words; 0 when a
    word does not match.
  - `findFuzzyMatchChunks` / `findDocumentSearchChunks`: `react-highlight-words`
    `findChunks`, merging chunks separated by whitespace.
- `searchQueryLength.ts` — length checks used by the API routes.

`Person.normalizedName` uses the same function, so existing rows stay valid.

### People and structures (sidebar)

`PersonDAO.fetchPeople` and `OrganizationUnitDAO.searchOrganizationUnits`:

1. Blank query → the former Prisma query (people by last name; group structures with at
   least one label).
2. Otherwise a raw SQL query (`src/app/lib/daos/search/trigramSearchSql.ts`) returns the
   ranked ids of the requested page and the total, in one transaction that sets the
   `pg_trgm` threshold (`set_config(..., true)`, transaction-local):
   - `buildTokenMatch(column, tokens)`: each word `LIKE '%word%'` or `word <% column`
     (≥ 3 letters); score = sum of whole word / prefix / substring / 0.7 × `word_similarity`.
   - Structures match on `normalizedAcronym` + all label `normalizedValue`s aggregated per
     unit; external and hidden units stay excluded.
3. Prisma loads those ids with the usual includes; results are reordered to the SQL order.

All user values are bound parameters (`$queryRaw` / `Prisma.sql` tagged templates); LIKE
wildcards and regex metacharacters are escaped.

### Documents list

`DocumentDAO.createFetchDocumentsWhere` stays a synchronous Prisma where builder so its
composition with perimeter, HAL, type, date filters, paging, sorting and count is intact:

- Global search: AND over words of OR[title, contributor name, journal title,
  publication date], on the normalized columns.
- Title / contributors / journal filters: every word must match the **same** title, person
  or journal.
- Typo variants come from `expandSearchTokens` (`src/app/lib/daos/search/SearchTermExpander.ts`),
  awaited by `fetchDocuments` and `countDocuments`: one SQL query finds, for each word of
  ≥ 4 letters without digits, up to 5 close words that really occur in titles, journal
  titles and people names (`%>` prefilter on the GIN indexes, `similarity ≥ 0.5`), unless
  the word itself occurs. The where clause then matches any variant with `contains`.
  Results are cached in process for 5 minutes (list and count share one lookup).

### Research structures (client) and members table

- `filterForest` (tree search) uses `fuzzyMatch` on the tree label.
- Flat and tree tables override MRT's `fuzzy` filter function with `fuzzyScore`, reported
  as the rank so MRT's ranked results keep working; the structure column searches acronym
  and name.
- `OrganizationUnitService.getStructureMembers` filters with `fuzzyScore`; with the
  default name sort (ascending) the best matches come first.

### Schema, write paths and backfill

- Migrations `fuzzy_search` (extension, columns, GIN indexes) and
  `drop_abstract_search_column`.
- Columns: `Person.normalizedName` (existing, now indexed), `DocumentTitle.normalizedValue`,
  `Journal.normalizedTitle`, `OrganizationUnitLabel.normalizedValue`,
  `OrganizationUnit.normalizedAcronym`.
- Every DAO write sets them. `npm run backfill:search-columns` (`:js` in the image) fills
  rows written before; `docker-bootstrap-app.sh` runs it in the background after the
  migrations (idempotent, no-op once done).

### API routes

`/api/people`, `/api/organizations`, `/api/organizations/[uid]/members` reject searches
over 200 characters; `/api/documents` and `/api/documents/count` reject a search term or
title filter over 500 characters and a contributors or journal filter over 200 (400).
The matching inputs carry the same `maxLength` (`searchFieldProps`): sidebar, members
table, documents global search and text filters, and the research structures tree search,
table searches and structure column filter (client-side only, limited for consistency).

### Debounce and stale responses

- Every search input is debounced before filtering or fetching: sidebar 500 ms,
  documents list global search 500 ms and text filters 400 ms, members table 500 ms
  (Material React Table), structures page tables 250 / 200 ms, structures tree search
  250 ms (clearing is immediate).
- Sidebar people and structure searches (one sequence per group) and the members table
  abort the request still in flight when a new one starts (`createLatestRequest`,
  `src/app/utils/latestRequest.ts`): a slow response to an older search can no longer
  overwrite newer results, and `loading` stays on until the latest request completes.
  The documents list already ignores stale responses through its request ids.

## Known limits

- Server-side, a letter swap in a very short word (`jaen` → Jean) is not caught; the
  client-side scorer catches it.
- Documents highlighting decides typos on its own (same rules as the client scorer); a
  rare server-side trigram variant may stay unhighlighted.
- A multi-word documents search no longer requires a contiguous phrase.
- Rows whose normalized columns are still null (backfill not run yet) are not found.
- `postgresqlExtensions` is a Prisma preview feature; a managed PostgreSQL where the app
  role cannot create extensions needs `CREATE EXTENSION pg_trgm` once
  (`docs/installation.md`).
