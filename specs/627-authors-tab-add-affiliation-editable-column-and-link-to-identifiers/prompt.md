## Context

This tab manages a publication's contributions (authors and affiliations), in preparation for a possible submission to HAL: identify authors in HAL (via their IdHAL) and map affiliations to HAL organizations (linked to a ROR identifier).

Position in the document workflow: `Bibliographic information → Keywords → Subject areas → Sources → Authors (this tab) → Upload to HAL`.

Mockups are at `[mockups path]/src/app/[lang]/documents/[uid]/components/Authors/Authors.tsx` (mockups path in `Claude.local.md`). Use the mockup only for layout and visual details — never for types, data formats or interaction logic.

> This spec is consolidated: each behaviour is described once, in its final intended state.

## HAL API access (backend proxy)

The component never calls the HAL API (`api.archives-ouvertes.fr`) directly. All HAL requests go through the app's backend: a Next.js API route calling HAL server-side, reusing/extending `AureHalAPIClient` (`src/app/lib/services/AureHalAPIClient.ts`), returning a typed result (keeps service/DAO layering, avoids CORS). The HAL URLs below describe what the **backend** requests.

Client-side, before hitting the proxy: 350 ms debounce, a 15 s timeout (a timed-out request counts as failed). Minimum query length is **2 characters**, **except** the name-based affiliation suggestions, which fire from **1 character**.

## Global workflow

The tab displays the document's contributors.

**Ranking mode** (boolean) drives display order:

- ON → contributors ordered by `rank` ascending (ranked first, then unranked in DB order).
- OFF → DB order.
- Default ON iff at least one contribution has a rank.
- A toggle (top-right) flips it; flipping does **not** reorder the currently displayed list.

Beside the toggle, right-aligned and with bold numbers, show the contributor count and the affiliation count (distinct affiliations across all contributors). The dedup key of an affiliation is the first present of `ror`, `idref`, `isni`, `nns`, `hal`, `wikidata`, or — if it has none — the lower-cased, trimmed `name` (else `label`, else imported text).

**Title:** an 'Authors' title (bold) sits on the same line as the toggle. A red asterisk follows the title **only when the tab is editable** (hidden in read-only mode).

**Unsaved state** (boolean): false until any change, then true until Save or Cancel. While true, a banner shows under the title/toggle row:

- Sticky; full-opacity background equal to the body background; no border except a thick light-orange left border; warning icon + text justified left, buttons right.
- Two actions, **Save before Cancel**. Save uses the text variant with teal font, a floppy-disk start icon and a bold label. Cancel resets the tab completely. Save performs the Save section below.

**Navigation guard:** leaving the tab/page while unsaved opens a modal ("don't save & continue" or "cancel & stay"). It is owned by an app-level `NavigationGuardProvider` (mounted once in `MainLayout`), not the document page:

- Editable surfaces register intent to block via `useBlockNavigation(enabled)`; this tab passes `contributionsTabDirty`.
- Interception is **at the navigation source**, never by patching `window.history.pushState` (that fights Next's App Router internals and causes render-phase state updates). In-app links use `GuardedLink` (drop-in `next/link`); programmatic navigation uses `useGuardedRouter().push/replace`; browser back/forward uses a provider `popstate` listener (bounce back, then prompt); hard unloads (reload, close, external) use a `beforeunload` prompt registered only while blocking.
- Guarded exit points: the tab bar, sidebar links, sidebar account menu, the "back to publication list" header button, and perspective switching from the sidebar search (select another person/research-unit, or "back to my perspective"). Confirming "leave" replays the exact navigation; cancelling stays.
- Rationale: App Router has no built-in navigation blocking and no sufficiently-maintained library, so this is in-house at the source for version stability and reuse.

**Read-only mode** is decided by the user's **permission**, never the viewing perspective: the CASL ability from the session authz context (`abilityFromAuthzContext(session.user.authz)`), checking `update` on the document for the `contributors` field — the same check the Save route enforces server-side. A direct document URL has no `perspective` param and must still be protected. In read-only mode there is no toggle and no editing control; the tab only displays each contributor's name, identifiers, roles (as plain comma-separated text after a 'Roles :' / FR 'Fonctions :' label — no roles autocomplete) and affiliations.

## Contributor display

Each contribution is a two-part card: left = name, status, identifiers, roles; right = affiliations. The card has a thin grey border (not a Paper-like shadow), rounded corners, and a vertical divider between the two halves in the same colour as the card border. Cards are vertically spaced when ranking mode is OFF.

A bin (DeleteOutline) at the top-right of the **left-side part** removes the contribution.

When ranking mode is ON, each card shows a drag handle (6 dots) and up/down arrows, and a drag-and-drop reorders the card — whether dropped onto another card **or** into the gap between two cards. 'Insert contributor here' text buttons sit between cards (not before the first); clicking one inserts a contribution at that position and then blurs (loses focus). When ranking mode is OFF, none of these (handle, arrows, insert buttons) exist.

A 'Add a contributor' text button sits under the last card (or when there are none).

### Status

Four statuses, from the contribution's identifiers:

- **Identified and aligned** — has a HAL IdHAL: `idhals` (string IdHAL, e.g. "jean-dupont", from HAL `idHal_s`) **or** `idhali` (numeric IdHAL). Prefer `idhals`; some contributors have only `idhali`, which still counts. **Never** treat HAL `form_i` (a name-form id) as `idhali`/an IdHAL.

A contributor identifier's `type` is a string-literal union (`WorkingIdentifierType`) derived from the Prisma `PersonIdentifierType` enum (so it can't drift). Raw type strings entering the working model pass through a single validation/normalization point (`normalizeIdentifierType` / `toWorkingIdentifiers`), which trims, lower-cases and drops unrecognised types.

- **Identified** — has an `orcid` or `idref` identifier. (Aligned prevails over Identified.)
- **Not aligned** — only when the user picks 'Add contributor' in the search-in-HAL autocomplete (see below).
- **Not identified** — otherwise.

Status display (left-side, under the name):

- Identified / Identified and aligned: green check icon (CheckCircle), text bold in the default font colour, no border.
- Not aligned: info (blue) with an info icon.
- Not identified: a light-orange background chip with an outlined warning icon.

Beside the status, list identifiers as type-icons with a tooltip showing the value, in order: ORCID, IdRef, IdHAL, Scopus (each only if present). Beside the identifiers, a pen icon button toggles the search-in-HAL autocomplete; when the autocomplete is shown the pen becomes a crossed-out pen (EditOff) with tooltip 'Hide search in HAL autocomplete'. The pen is **not** shown when the status is 'Not identified'.

### Searching a contributor in HAL

Under the status, a 'Search in HAL' autocomplete searches HAL author profiles. Visibility/box per status:

- Not identified: always shown, in a box with a light-orange background and orange border.
- Identified / Identified and aligned / Not aligned: hidden until the pen is clicked; when shown, the box has a light-grey background and a border.
- In all cases the TextField background equals the body background.

Behaviour: 350 ms debounce, request from ≥ 2 characters, a spinner shown **in the options** (no small input-adornment spinner) while pending, and the options replaced by an explanatory message when the request is too short, fails, or times out (15 s = failed).

Endpoint:
`https://api.archives-ouvertes.fr/ref/author/?q=[input]&fl=person_i,form_i,firstName_s,lastName_s,middleName_s,fullName_s,orcidId_s,emailDomain_s,idHal_s,idrefId_s&sort=idHal_s asc, orcidId_s asc,idrefId_s asc,emailDomain_s asc,lastName_s asc,firstName_s asc`

Response: `response.docs[]` of HAL profiles. Consumed fields: `fullName_s`, `firstName_s`, `lastName_s`, `orcidId_s`, `emailDomain_s`, `idHal_s`, `idrefId_s` (`person_i`/`form_i` are ignored). `response.numFound` is the count.

Options (only once results have loaded; spinner in options while pending):

- First option is **'Add contributor'** (italic) — change the contributor without picking a real HAL profile.
- Other options show `fullName_s`, then `emailDomain_s`, `idHal_s`, `orcidId_s`, `idrefId_s` (each if present), with no trailing point separator. `fullName_s` is bold and in the theme primary-main colour if the profile has `idHal_s`, `orcidId_s` or `idrefId_s`. Truncate `orcidId_s` (strip `https://orcid.org/`) and `idrefId_s` (strip `https://www.idref.fr/`); prefix the IdRef value with 'IdRef: '.
- Key each option by its position in the results, not its content (HAL can return duplicates → React duplicate-key error).

Selecting a profile replaces the card data: `fullName_s` → displayName; `firstName_s`/`lastName_s` → the person's first/last name; identifiers replaced by `idHal_s`→`idhals`, `orcidId_s`→`orcid`, `idrefId_s`→`idref` (other ids, incl. `form_i`/`person_i`, ignored); status recomputed; the rest of the doc kept in temporary storage until Save. After selecting, hide the autocomplete and clear the contributor's affiliations.

Selecting **'Add contributor'**: the input text becomes the displayName, all identifiers are removed, status becomes 'Not aligned', and the contribution is **detached** from its person (its `uid` becomes `null`). On an existing contributor this detach is what makes Save emit a **REMOVE** of the old person uid plus an **ADD** with `uid: null` (rather than an UPDATE).

### Roles

Under the above, a multi-valued autocomplete whose options are the `LocRelator` enum values translated into the user's language (FR label 'Fonctions'). Default selection = the contribution's roles, or 'Contributor' if none. Clearing all values re-selects 'Contributor' (never empty). When 'Contributor' is the only selected role, show the warning 'Default role - please check' below the field and give the autocomplete a light-orange border.

## Affiliations (right-side)

Affiliations are unordered, each in its own card. A collapsed 'Add HAL affiliation' accordion sits under them (or when there are none). A bin at the top-right of each affiliation card removes it.

An affiliation is **identified** iff it has a `hal`, `ror`, `idref`, `nns`, `isni` or `wikidata` identifier.

**Identified card:** a success tick; `displayNames[0]` bold in the theme primary-main colour, followed by identifier tags. Tag format = identifier type in CAPS + a space + value (e.g. `ROR 04ezmf85`), ROR first. Tags have no border, a light-teal background and a teal font. Truncate ROR everywhere (strip `https://ror.org/`).

**Not-identified card:** a warning box with a lighter-orange background/border. First a warning icon + 'Missing HAL affiliation' label; then `displayNames[0]` in quotes preceded by a teal 'Imported text:' label; then a 'Suggest' text button (left-aligned, bold, chevron end-icon — see below); then the manual structure autocomplete (same as the 'Add HAL affiliation' accordion).

### Suggest affiliation on name base

When not identified, query the HAL structure endpoint with `displayNames[0]` (1-character minimum):
`https://api.archives-ouvertes.fr/ref/structure/?q=[displayNames[0]]&fl=*&sort=docid asc,rnsr_s asc,ror_s asc,idref_s asc,isni_s asc,wikidata_s asc`

Response: `response.docs[]` of HAL organizations. Consumed fields: `docid`, `name_s`, `label_s`, `acronym_s`, `valid_s`, `code_s`, the identifier arrays `idref_s`/`isni_s`/`rnsr_s`/`ror_s`/`wikidata_s`, and `parentAcronym_s`/`parentName_s` (URL, date and other parent fields are ignored).

If `docs` is non-empty, show a 'Suggest ([N] matches in HAL)' button. Clicking it shows the result boxes and replaces the button with a 'HAL suggestion : [N]' subtitle (grey, heavier subtitle variant) plus a right-aligned 'Hide' button with a bold count (Hide returns to the button + hidden results).

Result boxes — ordered with ROR-bearing results first — each on the body background:

- Top line: tags, first the `acronym_s` (bold) if present, then one per identifier (same tag rules as identified affiliations: light-teal bg, teal font, type in CAPS + value, ROR first).
- Second line: `name_s` (or `label_s` if empty), bold and primary-main colour if the org has `ror_s`.
- Third line (caption): 'Supervised by :' + `parentAcronym_s` values, or `parentName_s[0]` if `parentAcronym_s` is empty, or nothing. FR: 'Tutelle' (one value) / 'Tutelles' (several).
- Fourth line (caption): `code_s` if present.
- Right side: an 'Align' button (contained variant).

Aligning uses the HAL org's data: the affiliation becomes identified, `name_s` (or `label_s`) → `displayNames[0]`, identifiers mapped `idref_s`→`idref`, `isni_s`→`isni`, `rnsr_s`→`nns`, `ror_s`→`ror`, `wikidata_s`→`wikidata`; the rest kept in temporary storage until Save.

### Adding an affiliation

The 'Add HAL affiliation' accordion has a light-grey dashed border, a plus start-icon and a bold teal title. Expanding it reveals a HAL structure autocomplete (350 ms debounce, ≥ 2 characters) using the same structure URL as above. On error/timeout, show an error message instead of options; on empty results, show 'Not found'. Selecting an option adds the organization to the affiliations per the display rules above (not persisted until Save).

Results ordering: by `valid_s` VALID → INCOMING → OLD; within the same `valid_s`, ROR-bearing first, then by identifier count (most first). Each result: `name_s` (or `label_s`) — bold + primary-main if it has `ror_s`, then a caption with `acronym_s` (if any) and identifiers joined by a space, each formatted as type in CAPS + ': ' + value (e.g. `ROR: 04ezmf85`), ROR first. (Note this colon form differs from the tag form `ROR 04ezmf85` used on affiliation cards and suggestion boxes.) Colour by `valid_s`: VALID → bold green; INCOMING → bold dark-orange; OLD → grey, normal weight.

## Adding a new contribution

Via the 'Add a contributor' or 'Insert contributor here' button. The new card is a non-identified contributor with displayName 'New contributor', no identifiers, status 'Not identified', the search-in-HAL autocomplete shown, roles = 'Contributor', no affiliations, and the 'Add HAL affiliation' accordion **disabled** until a HAL profile is selected. Everything else behaves as above.

## Save

Save writes **no** contribution data to the DB. Instead it creates `Action` rows for each contribution that was added, updated or deleted; the change poller later publishes them to RabbitMQ (`graph` exchange) to keep the Neo4j graph in sync.

Every contribution action uses `targetType: DOCUMENT`, `targetUid: <document uid>`, `path: 'contributions'` (contributions are a sub-resource of the document — do not add a new target type). The contribution's identity travels inside `parameters` via the person uid.

- **REMOVE** (deleted contribution): `parameters = { person: { uid } }`.
- **ADD / UPDATE** (added / updated): `parameters =`
  ```
  {
    person: { uid: string|null, displayName: string, firstName: string|null,
              lastName: string|null, identifiers: [{ type: string, value: string }] },
    roles: string[],            // LoC relator URIs, via LocRelatorHelper.toUri (not enum labels)
    rank: number|null,
    affiliations: [{ acronym, name, label, hal, idref, isni, nns, ror, wikidata }]  // each string|null
  }
  ```
  A brand-new contributor (never persisted) sends `person.uid: null` (the graph mints/matches by identifiers).
- **Rank:** if ranking mode is ON at save time, `rank` = the card's 1-based position in the list (first card = 1); if OFF, `rank` is `null` for every contribution. This is intended and destructive (saving with ranking OFF clears all ranks).
- A brand-new contributor row that was never filled in (no uid, blank displayName, no identifiers) is skipped: it produces no ADD action and does not mark the tab dirty.

**Refresh model — pessimistic and durable.** On Save the in-memory edits are discarded and the tab is **frozen** (read-only) until the document is refreshed from the graph. The freeze is stored on `Document.state = waiting_for_update`, not in client-only state, so it survives navigation and re-fetches:

- The server (`DocumentService.saveContributions`) calls `markDocumentsWaitingForUpdate([documentUid])` after creating the actions (a status flag only — no contribution data written).
- The store optimistically sets `selectedDocument.state = waiting_for_update` for immediate feedback; the editor derives `isFrozen` from `document.state === waiting_for_update`.
- When the change round-trips (inbound AMQP → `DocumentWorker` → WebSocket → refreshed `selectedDocument`), `DocumentDAO` resets `state` to `default`, so the refreshed document unfreezes the tab and becomes the new baseline. A re-fetch of a still-pending document keeps it frozen. There is no timeout/escape hatch.
- Consequence (accepted): while pending, the document shows the existing greyed/shimmer "in-flight" treatment in the publication list and is not selectable for merge (like a merge-pending document); its details remain openable.

**DB migration:** add `rank` to the Prisma `Contribution` model. The domain `Contribution` (`src/app/types/Contribution.ts`) and `ContributionJson` already declare `rank` but never populate it from the DB — wire it through `Contribution.fromDbContribution` once the column exists.
