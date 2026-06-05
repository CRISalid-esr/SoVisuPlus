## Context

This tab allows to manage the contributions (authors and affiliations) for a publication, particularly in preparation for a potential submission to HAL. It enables users to identify authors in HAL (using their IdHAL) and to map affiliations to HAL entities (linked to a ROR identifier).

## Position in the workflow

```
My publications → [publication record]
   ├── Bibliographic information
   ├── Keywords
   ├── Subject areas
   ├── Sources
   ├── Authors           ◄── THIS TAB
   └── Upload to HAL
```

You will find mockups for the tab in the [mockups path]/src/app/[lang]/documents/[uid]/components/Authors/Authors.tsx (mockups path is defined in Claude.local.md).
Only use mockup file to understand page layout and display details, dont import types, data formats, interaction logic, etc

## HAL API access (backend proxy)

The component never calls the HAL API (api.archives-ouvertes.fr) directly. All HAL requests (author search and structure search) go through the app's own backend: a Next.js API route that calls HAL server-side, reusing/extending the existing `AureHalAPIClient` (src/app/lib/services/AureHalAPIClient.ts), and returns a typed result. This keeps the app's service/DAO layering and avoids browser CORS issues. The HAL URLs given below describe what the **backend** requests; debounce (350ms), the 2-character minimum and the 15s timeout still apply on the client side before hitting the proxy.

## Global workflow

The tab displays document's contributors.

Contributor's display order depends on the tab ranking mode's state. The ranking mode could be set on true or false.

At initialisation, if ranking mode's state is set on true, contributors are listed according to their rank. Contributions with a rank are put in first from the lower value to the higher, and other contributions are listed below according to their order in the database.

Otherwise, if ranking mode is set on false, contributors are listed according to their order in the database.

By default, ranking mode state is set on true if at least one contributor has its rank specified.

At any time, the user can change the ranking mode state thanks to the toggle UI component at the top right corner of the tab. Switching between the two ranking mode doesn't refresh current contributors display's order. Beside the toggle, the current number of contributors and of affiliations are shown. The affiliations number is the count of distinct affiliations across all contributors (deduped by identifier).

The tab has also an unsaved state. It could be true or false. Till there is no changes in the page, the state is set on false. Whenever there is a change, the state becomes true until user save or cancel its changes. When the state is true, a light warning banner at the top of the tab is displayed. The banner recalls that there is unsaved changes in the page and propose two actions : Save or Cancel. As the name suggest, Cancel reset completely the tab's data and the display while Save performs actions describe in Save section.

If user try to navigate to another tab or page while unsaved state is true, a modal should appears to notice that there is unsaved changes and asking the user what to do. The user can choose to not save and continue its navigation otherwise user can cancel and come back to the page where it could perform saving from the top banner.

## Contributor display

Each contribution is displayed in a two-part card box:

- left-hand side: the contributor's name, roles and identifiers
- right-hand side: contributor's affiliations

A bin icon in the top-right corner of the card allows user to remove the contribution

Depending on tab's ranking state, a handle (with 6 points) and vertical arrows could be display to allow the user to update the ranking of the contributor if the ranking mode is set on true. In that case, 'Insert contributor here' text button are also put between each contributor card, allowing user to add a new contribution at a particular place in the list. Otherwise, if tab's ranking mode is set on false, any of these components should exist.

Under the last contributor card or when there is no contributor at all, a 'Add a contributor' text button is put. As the name suggest, it allows user to add a contributior.

Each contribution has a state describing its status. There are 4 kind of status :

- Identified and aligned
- Identified
- Not aligned
- Not identified

A contribution that has at least a HAL identifier — `idhals` (string IdHAL, e.g. "jean-dupont") or `idhali` (numeric IdHAL) — is considered 'Identified and aligned'. A contribution that has at least an identifier of type orcid or idref is considered 'Identified'. 'Identified and aligned' prevails on 'Identified' in case of ambiguity.

IdHAL type handling: prefer `idhals` (the string IdHAL, which is what the HAL author API returns as `idHal_s`). Some contributors only have an `idhali` (numeric IdHAL) and no `idhals`; in that case `idhali` still counts as 'Identified and aligned'. **Never confuse `idhali` with `form_i`** ('forme auteur'): `form_i` is HAL's numeric identifier for a raw name string (an author-name form), NOT an IdHAL, and must never be stored or treated as an `idhali` identifier.
A contribution is 'Not aligned' only when user choose the 'Add a contributor' in the search in HAL autocomplete field (see below).
Otherwise, the contribution is 'Not identified'.

### Left-hand side

The contributor’s displayName is displayed. The contribution's status should be put under. When it's 'Identified and aligned' or 'Identified', the status is displayed in success mode. Beside status, identifiers should be listed. They are displayed by the icon corresponding to their type and wrapped in a tooltip showing the identifier value when the user hover the icon. They should be displayed in following order : ORCID (if exist), IdRef (if exist), IdHAL (if exist), Scopus (if exist). Beside them, a pen icon button is shown (behavior is explained below).

When contribution's status is 'Not aligned', it should be displayed in info mode (blue). Beside it, the pen icon button is also shown.
If contribution's status is 'Not identified', the status is displayed in warning mode.

Under the status display, an autocomplete allowing to search a profile on HAL portal (see next section 'Searching a contributor in HAL') appears depending on the contribution's status.
When contribution's status is 'Not identified', the autocomplete is shown into an orange (warning color) box. When contribution's status is 'Identified' the autocomplete is shown into a grey box. For two other cases, the autocomplete is hide until user click on the pen icon button (the pen is wrapped into a tooltip that inform the user of the action is going to perform). The autocomplete should be in a grey box in both cases.

Under previous elements, another autocomplete field is shown. This input is multi-valued. Autocomplete's options correspond to values in the LocRealtor enum (in LocRelator.ts file) translate in the user language. By default, values in the contributor data's roles field are selected. If there is no roles in data, the 'Contributor' role is selected as default. If this role is the only one selected for a contribution, a warning label should be put below the autocomplete with following message : 'Default role - please check'

#### Searching a contributor in HAL

The 'Search in HAL' autocomplete should be debounce (350 ms) so that quick typing doesn't generate to much request. Request should be done if there is at least 2 characters in the input field. A message should explain it to user in options. Options should always be replaced by message explaining what's happen when request failed or couldn't be performed. A loading circle should be displayed while waiting for response. If request takes to much time (more than 15 seconds), request should be considered as failed.

The autocomplete request following API endpoint : "https://api.archives-ouvertes.fr/ref/author/?q=[input],&fl=person_i,form_i,firstName_s,lastName_s,middleName_s,fullName_s,orcidId_s,emailDomain_s,idHal_s,idrefId_s&sort=idHal_s asc, orcidId_s asc,idrefId_s asc,emailDomain_s asc,lastName_s asc,firstName_s asc" where [input] is the value entered by the user in field. The response object structure is as follow :
response : {
numFound : integer
start : integer
numFoundExact : boolean
docs : [
{
person_i : integer or undefined
form_i : integer
firstName_s : string
lastName_s : string
middleName_s : string or undefined
fullName_s : string
orcidId_s : array of strings or undefined
emailDomain_s : array of strings or undefined
idHal_s : string or undefined
idrefId_s : array of strings or undefined
}
]
}
numFound is the number of object returns by the response in docs entry. start is the pagination offset. numFoundExact is an unused value. Docs corresponds to HAL contributor profile list. It should be used to render autocomplete options.

The first option is a particular value, 'Add contributor' (in italic), that allows user to change the contributor without selecting a true HAL profile. Other option should displayed HAL profile data as follow : fullName_s, emailDomain_s (if it exists), idHAl_s (if it exists), orcidId_s (if it exists) and idrefId_s (if it exists).
fullName_s should be put in bold with theme palette primary main color for font if the profile has an idHal_s, an orcidId_s or an idrefId_s.
orcidId_s and idrefId_s should be truncated to keep only relevant value (i.e. part "https://orcid.org/" for orcidId_s and part "https://www.idref.fr/" for idRefId_s should be removed). idRefId_s should be preceed by the label 'IdRef:'.

When user select an option, data in the contribution's card are replaced by option ones. fullname_s is used as displayName, and HAL's firstName_s / lastName_s are mapped into the person's firstName / lastName too. Previous identifiers are replaced by option's ones using idHal_s as an `idhals` identifier, orcidId_s as orcid id and idrefId_s as idRef id - other ids (including `form_i` and `person_i`) are not taken into consideration. Contribution's status is updated according to new data. All other option's data should be kept in a temporary storage pending for user to save changes.

If user select the 'Add contributor' option, input is used to replace displayName. All contributor's identifiers are removed from display. The contribution's status turns to 'Not aligned'.

### Right-hand side: Affiliations

This part displays contribution's affiliation. Affiliations are unordered. Each affiliation is displayed in its own card. Under affiliations or if there is no affiliations, a 'Add HAL affiliation' accordion is set. The accordion is collapsed by default.

#### Affiliation display

An affiliation has an identified state that could be true or false. It is true if affiliation has a hal, ror, idref, nns, isni or wikidata identifier. Otherwise, the state is false.

When identified is true, a success tick is displayed. The first value in displayNames should be put in theme palette primary main color and bold followed by tags for identifiers. Identifier's display follow this pattern : identifier type in CAPS + blank + identifier value (for example : ROR 04ezmf85). ror identifier should be put in first.

When identified state is false, the affiliation card is displayed as a warning box. A label 'Missing HAL affiliation' should be put at first place. The first diplayNames value should be put under in quotes, preceded by the label 'Imported text:'. Under it, a text button allows user to display suggestion on affiliation name base (see 'Suggest affiliation on name base' section below). Then an autocomplete is displayed below to search an organization on HAL API. It is the same used in 'Add HAL affiliation' accordion (see 'Adding an affiliation' section below for implementation details).

Regardless the value of the identified state, a bin allowing user to remove the affiliation is settle at the right top corner of the card.

#### Suggest affiliation on name base

When affiliation is not identified, suggested HAL affiliations are given through HAL API's structure endpoint call using displayNames[0] to suggest corresponding HAL affiliations. The request URL is :
https://api.archives-ouvertes.fr/ref/structure/?q=[displayNames[0]]&fl=*&sort=docid asc,rnsr_s asc,ror_s asc,idref_s asc,isni_s asc,wikidata_s asc

Response object looks like :
response : {
numFound : integer
start : integer
numFoundExact : boolean
docs : [
{
aliasDocid_i : array of integer
docid : string of digits
idref_s : array of strings
idrefUrl_s : array of strings
isni_s : array of strings
isniUrl_s : array of strings
rnsr_s : array of strings
rnsrUrl_s : array of strings
ror_s : array of strings
rorUrl_s : array of strings
wikidata_s : array of strings
wikidataUrl_s : array of strings
locked_bool : boolean =>unused
label_xml : xml in string format =>unused
label_s : string
name_s : string
acronym_s : string
country_s : string
url_s : string
type_s : string
valid_s : string
updateDate_s : ISO date in string format
updateDate_tdate : ISO with timestamp date in string format => unused
startDate_s : date in string format
endDate_s : date in string format
parentDocid_i : array of strings of digits
parentAcronym_s : array of strings
parentName_s : array of strings
parentAddress_s : array of strings
parentCountry_s : array of strings
parentUrl_s : array of strings
parentType_s : array of strings
parentValid_s : array of strings
parentIdref_s : array of strings
parentIdrefUrl_s : array of strings
parentIsni_s : array of strings
parentIsniUrl_s : array of strings
parentRnsr_s : array of strings
parentRnsrUrl_s : array of strings
parentRor_s : array of strings
parentRorUrl_s : array of strings
parentWikidata_s : array of strings
parentWikidataUrl_s : array of strings
code_s : array of strings
label_html : html in string format
_version_ : long integer => unused
dateLastIndexed_tdate : ISO with timestamp date in string format => unused
}
]
}
Each entry in docs represents an organisation that could be picked as the contributor's affiliation. If the request returns an non empty array in docs (equivalent to have numFound not equals to zero), the 'Suggest ([number of results] matches in HAL)' text button could be shown in the affiliation's box. When user click on it, results are displayed in boxes and the Suggest button is replace by a subtitle 'HAL suggestion : [number of suggestion]' with a 'Hide' text button beside allowing to come back to previous display (with Suggest button shown and results boxes hiden).

Each box displays, at its top, tags with a first one for the acronym_s (if exists, should be put in bold) then one for each identifiers (follow display guideline for identifiers as described in 'Affiliation display' section). Then on second line, the name_s value is displayed (or label_s if name_s doesn't exist or is empty). This data should be displayed in bold and theme palette primary main color if affiliation has a ror_s defined. On third line, 'Supervised by :' followed by list of values in parentAcronym_s is put in caption. If parentAcronym_s is empty, first value of parentName_s should be used instead. If parentName_s is also empty, put nothing. Then on fourth line, code_s should be put in caption if it exists, otherwise nothing. On right side of the box, an 'Align' button allows user to replace the not identified affiliation by the selected HAL organization.

When the Align button is clicked, data from HAL organization is used in the affiliation card instead of defaults ones and the affiliation is considered identified. The card display is updated according to these new data with name_s or label_s used as the displayNames[0]. Identifiers should be also updated, according to following type mapping between HAL and app types :

| HAL API Identifier | App identifier type |
| ------------------ | ------------------- |
| idref_s            | idref               |
| isni_s             | isni                |
| rnsr_s             | nns                 |
| ror_s              | ror                 |
| wikidata_s         | wikidata            |

Others HAL organization data should be temporary store pending for user saving changes.

####Adding an affiliation
By clicking on 'Add HAL affiliation', the accordion is expanded. It reveals a search in HAL affiliation autocomplete allowing user to find an HAL organization to add in contributor's affiliations. As all autocomplete in the page, it should be debounce (350ms) and required at least two characters to perform the search. The request HAL API URL is the same as in previous section : "https://api.archives-ouvertes.fr/ref/structure/?q=[input]&fl=*&sort=docid asc,rnsr_s asc,ror_s asc,idref_s asc,isni_s asc,wikidata_s asc" where input is the value entered by the user. Response object is the same than in previous section. If an error occur or the result takes to much time (more than 15 secondes), an error message is displayed instead of options. If results are empty, display a 'Not found' message. When user select an option, the selected organization is added to the other affiliations in the display according to the 'Affiliation display' section rules (it is not added in database yet, it will be performed at save time)

##### Results display

Results should be ordered according to valid_s value : VALID in first, then INCOMING and finally OLD.
For same valid_s value, results with ror_s are put in first and, whenever there is ror_s or not, in case of equality, results with the most of identifiers should be put in first.
For each results, put the name_s if exists or label_s instead. This data is displayed in bold and theme palette primary main color if affiliation has a ror_s defined. Then in caption beside it, the acronym_s (if exist) and identifiers (not in tag but with the identifier type in CAPS + identifier value format described previously, remove the blank only, put ror identifier in first) are displayed. If valid_s is equal to VALID, the name_s (or label_s) should be put in bold and green color (success). Else if valid_s is equal to 'INCOMING', the displayed color is dark orange (warning) and font is also in bold. If valid_s is equal to 'OLD', the color is grey and font weight is normal.

## Adding a new contribution

The user can add a contribution by clicking the ‘Add a contributor’ button or link or by clicking on the 'Insert a contributor' link.
The contribution box that appears is the same that for a non-identified contributor, except that the display name is 'New contributor'. There is no identifers, status is non-identified, the search HAL profile autocomplete is shown and roles select input is set with Contributor role selected. There is no affiliation set and the 'Add HAL affiliation' accordean is disable until user select an option in the Search Hal profile autocomplete field. Components works exactly the same as describe previously.

##Save
When clicking on Save, data are not saved in database. Instead, Action are created into the database for each item that has changed. These Action rows are later picked up by the change poller and published to RabbitMQ (the `graph` exchange) so the Neo4j graph is kept in sync.

Refresh model: **pessimistic**. After Save, the tab does NOT optimistically treat the current display as the new baseline. Instead, on Save the in-memory edited state is discarded and the tab is frozen (read-only, no further editing) for the user until the document is refreshed from the graph — i.e. once the change has round-tripped through the graph and comes back via the inbound AMQP → `DocumentWorker` → WebSocket path, refreshing `selectedDocument`. The freshly refreshed `selectedDocument` becomes the new baseline and the tab is unfrozen. There is no timeout or escape hatch: if the refresh never arrives (graph down, AMQP failure), the tab stays frozen until a refreshed document is received.

###Action
An action should be created for each contribution that has been changed, added or deleted.
Contributions are a sub-resource of the document, so reuse the existing DOCUMENT ActionTargetType (do not add a new target type). Every contribution action uses:

- targetType : DOCUMENT
- targetUid : the document uid
- path : 'contributions'
  Because targetUid is the document (not the contribution), the contribution's identity must be carried inside the `parameters` object via the contributor's person uid (see `person.uid` in the payload below). For an existing contribution, `person.uid` is the known person uid. A brand-new contributor (added via "Add a contributor" / typed manually, never persisted) has no uid yet: send `uid` as null and let the graph/consumer mint it / match by identifiers.

If a contribution has been deleted, the corresponding action should be created with DOCUMENT ActionTargetType, path 'contributions' and REMOVE ActionType. parameters identifies the removed contribution via `person.uid`. (optimist ?)
If a contribution has been added or updated, the corresponding action should be created with DOCUMENT ActionTargetType, path 'contributions' and ADD or UPDATE ActionType. parameters object to send is : {
person : {
uid : string or null
displayName : string
firstName : string or null
lastName : string or null
identifiers : [
{
type : string
value : string
}
]
}
roles : array of strings (LoC relator URIs, e.g. "http://id.loc.gov/vocabulary/relators/aut", not the enum value/label)
rank : number or null
affiliations : [
{
acronym : string or null
name : string or null
label : string or null
hal : string or null
idref : string or null
isni : string or null
nns : string or null
ror : string or null
wikidata : string or null
}
]
}
(pesismist)

If the tab is in ranking mode at save time, rank is equal to the position of the contribution card in the display. Otherwise, rank is null. This is intended and destructive: saving while ranking mode is OFF sets rank to null for every contribution, clearing any rank that previously existed.
Roles are selected/displayed as labels (`LocRelator` enum values) but must be sent in the payload as LoC relator URIs. Use the existing `LocRelatorHelper.toUri(relator)` helper to build the payload.

The rank field is missing in the DB, you will have to add it to the Prisma Contribution model. Note: the domain type `Contribution` (src/app/types/Contribution.ts) and `ContributionJson` already declare `rank`, but it is never populated from the DB — wire it through `Contribution.fromDbContribution` once the column exists.

## UI refinements (round 2)

### Affiliation part — missing (not-identified) affiliation

1. Add a warning icon before the 'Missing HAL affiliation' label.
2. Use a lighter orange for the card background and border (not the heavy orange).
3. The 'Imported text:' statement is in teal (theme palette primary main color); the following affiliation name keeps its current color.
4. The 'Suggest' text button is left-aligned, its text is bold, and it has a right-arrow (chevron) icon as end decoration.
5. When the HAL affiliation suggestions are open, the 'Hide' text button is right-aligned and the number of suggested affiliations is in bold.
6. Each suggested-affiliation card: tag background in light teal, tag font in teal, affiliation name in bold, 'Align' button in contained variant, card border in light teal. French translation of 'Supervised by' is 'Tutelle' when there is a single value after it and 'Tutelles' when there are multiple.

### Affiliation part — global

1. Remove the splitter line above 'Add a HAL affiliation'. Instead the accordion has a light grey dashed border, a 'plus' icon as start decoration, and a bold teal title.
2. Truncate the ROR identifier everywhere: strip the 'https://ror.org/' part to keep only the relevant value.
3. In a HAL affiliation option's display, put ': ' after the identifier type (e.g. `ROR: <value>`).

### Contributor left-side part

1. Add an icon beside the status: warning icon for 'Not identified', success icon (green check) for 'Identified' and 'Identified and aligned', info icon for 'Not aligned'.
2. Change the pen icon to a crossed-out pen when the 'Search in HAL' profile autocomplete is shown, and change the tooltip to 'Hide search in HAL autocomplete'. Do not show the pen icon when the contribution status is 'Not identified'.
3. Hide the 'Search in HAL' profile autocomplete after an option is selected.
4. Clearing all selected values in the roles autocomplete must select the 'Contributor' option as default (never leave an empty field).
5. Remove the trailing point separator in the option's second-line display.
6. French translation of the roles autocomplete label is 'Fonctions' (instead of 'Rôles').
7. For 'Not identified' contributors, the 'Search in HAL' wrapping box uses a light orange background and orange borders (not the heavy orange).
8. In HalAuthorAutocomplete, key each option by its position number in the results (not by content) — HAL can return duplicates, which throws a React duplicate-key error.

### Global

1. The tab has an 'Authors' title with a red asterisk beside it.
2. The contributor card's delete (bin) button is at the top-right corner of the contributor left-side part (not in the card header).
3. The unsaved-changes banner is sticky; its items are horizontally center-aligned.
4. All autocompletes display a loading circle while a request is pending.
5. The contributor and affiliation counts are right-aligned, after the ranking-mode toggle, with the numbers in bold.
6. Ranking mode: remove the top 'Insert contributor here' button (keep the ones between cards). The contributor card handle allows drag-and-drop to change its rank/position.
7. Read-only mode when the user is on a perspective other than their own: editing controls disappear (the user must not change other perspectives' data). The Author tab then only displays the contributor name, identifiers, roles (roles autocomplete functionality disabled) and affiliations.

## UI refinements (round 3)

### Affiliation part — missing (not-identified) affiliation

- 'Identified' affiliation card identifier tags must have no border, a light teal background and a teal font color.

### Affiliation part — suggestions

- When the HAL affiliation suggestions are shown, the 'HAL suggestion' label is in grey color with a heavier weight (subtitle text variant).
- A HAL affiliation suggestion card has the same background as the body (according to the selected theme mode — light or dark).

### Contributor left-side part

- The 'Not identified' status is shown with a light orange background and an outlined warning icon. The 'Identified' and 'Identified and aligned' statuses have no border and their text is bold in the default font color.
- When the only selected role is 'Contributor', the roles autocomplete border is light orange.
- The 'Search in HAL' profile autocomplete background color is the same as the body background color (according to the selected theme mode).
- Put the 'Add a contributor' option only once options have been loaded; show a spinner in the options while the request is pending.
- Remove the contributor's affiliations after an option has been selected in the 'Search in HAL' profile autocomplete.

### Autocompletes (all)

- Remove the small input spinner in every autocomplete while a request is pending; keep only the larger spinner shown in the options.

### Global

- The 'Authors' title is on the same line as the ranking-mode toggle and is in bold (heavier font weight).
- Contributor cards use a thin grey border instead of the Paper-like shadow/box styling. Increase the vertical spacing between the elements below the contributor status (in the card's left-hand side).
- The unsaved-changes banner sits under the title and ranking-mode toggle. It has a full-opacity background equal to the body background color (e.g. white in light mode), no surrounding border, only a thick light-orange left border. The warning icon and text are justified left and the buttons right. The Save button uses the text variant with a teal font color and a floppy-disk start icon.
- The ranking-mode drag-and-drop handle must actually reorder the contributor card (fix the broken handle).

## UI refinements (round 4)

### Contributor card

- The contributor card corners are more rounded (increased border radius).
- The contributor card uses a thin grey border instead of a Paper-like shadow/box.

### Search in HAL profile autocomplete

- When the contribution status is different from 'Not identified', the 'Search in HAL' profile autocomplete wrapper box has a light grey background.

### Unsaved-changes banner

- The Save button comes before the Cancel button; the Save button label is in bold.

### Ranking mode

- Drag-and-drop must work not only when a contributor is dropped onto another contributor, but also when it is dropped between two contributors (the gap where the 'Insert contributor here' button sits).
- The 'Insert contributor here' button is deselected (loses focus) after being clicked.

## UI refinements (round 5)

### Contributor card

- Add vertical spacing between contributor cards when ranking mode is off.
- Add a vertical splitter between the card's left-hand and right-hand sides; the splitter uses the same color as the card border.

### Search in HAL profile autocomplete

- When the contribution status is different from 'Not identified', the 'Search in HAL' profile autocomplete wrapper box also has a border (in addition to its light grey background).

## UI refinements (round 6)

### Read-only mode

- The read-only (display-only) mode must be decided by the user's permission to edit this document's contributors, NOT by the viewing perspective. Use the same authorization as the Bibliographic tab: the CASL ability built from the session's authz context (`abilityFromAuthzContext(session.user.authz)`), checking `update` on the document for the `contributors` field. This is the same check the Save API route enforces server-side. Do not rely on a `perspective` URL parameter: a direct URL to a document uid has no perspective param and must still be protected (an unauthorized user must get the read-only display, never editable controls).
- In read-only mode, the contributor's roles are displayed as plain text: a 'Roles :' label (French: 'Fonctions :') followed by the role labels joined by commas. The roles autocomplete is removed.

### Affiliation suggestions

- In the HAL affiliation suggestions list, results that have a ROR identifier are placed at the top of the list.

## Behaviour & architecture refinements (round 7)

### Freeze until the graph confirms (durable, not per-session)

- The Authors tab must stay frozen until the graph has actually applied the change, even across navigation and re-fetches. The freeze must NOT be lost by leaving the page and coming back before the round-trip completes.
- Implementation: reuse the existing `Document.state = waiting_for_update` flag (the same one merge uses), rather than a client-only flag.
  - On save, the server (`DocumentService.saveContributions`) calls `markDocumentsWaitingForUpdate([documentUid])` after creating the `Action` rows. This is a status flag only — no contribution data is written (the pessimistic model is preserved).
  - The store optimistically sets `selectedDocument.state = waiting_for_update` on save success for immediate feedback.
  - The editor derives `isFrozen` from `document.state === waiting_for_update` (no local frozen state).
  - The flag auto-clears: when the graph re-writes the document, `DocumentDAO` resets `state` to `default` (existing behaviour), so a refreshed document unfreezes the tab. A re-fetch of a still-pending document returns `waiting_for_update` and keeps it frozen.
- Consequence (accepted): a document with a pending contributions save shows the existing greyed/shimmer "in-flight" treatment in the publication list and is not selectable for merge, exactly like a merge-pending document; its details remain openable.

### Empty new contributors are not saved

- A brand-new contributor row that was added but never filled in (no person uid, blank display name, no identifiers) must not produce an ADD action and must not mark the tab dirty. The diff (`buildContributionChanges`) skips such empty rows.

### Read-only asterisk

- The red asterisk after the tab title marks the tab as editable. It is shown only when the user can edit (i.e. not in read-only mode).

### App-wide unsaved-changes navigation guard

- The unsaved-changes guard is a cross-cutting concern owned by an app-level provider (`NavigationGuardProvider`, mounted once in `MainLayout`), not bolted onto the document page. Any editable surface registers intent to block via `useBlockNavigation(enabled)`; the document page passes `contributionsTabDirty`.
- Navigation is intercepted **at the source**, never by patching `window.history.pushState` (which fights Next's App Router internals and triggers render-phase state updates):
  - In-app links use `GuardedLink` (drop-in `next/link` replacement); programmatic navigation uses `useGuardedRouter().push/replace`. Both funnel through the guard.
  - Browser back/forward is handled by a `popstate` listener in the provider (bounce back to the page, then prompt).
  - Hard unloads (reload, tab close, external links) are handled by a `beforeunload` prompt in the provider.
- All exit points from a dirty Authors tab are guarded: the tab bar, the sidebar navigation links, the sidebar account menu, and the "back to publication list" button in the document header. Confirming "leave" replays the exact intended navigation; cancelling stays.
- Rationale: Next.js App Router has no built-in navigation blocking, and there is no sufficiently-maintained library for it, so the guard is implemented in-house at the navigation source for stability across Next versions and reuse by future editable surfaces.
