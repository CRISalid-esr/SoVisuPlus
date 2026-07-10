# 838 — Automated HAL deposit

## HAL SWORD deposit

### Overview

The TEI-XML conversion from the internal database schema is already implemented (`HalTEIInterchangeService`). This feature adds the HTTP layer that submits documents to HAL via the SWORD API, plus the database entities and async infrastructure needed to manage the deposit lifecycle.

**Scope for this iteration: POST only** (new deposits). PUT (updating an existing HAL record) is deferred — it requires downloading the existing XML-TEI from HAL, pushing a new version, and using a HAL account with impersonation rights.

The HAL API base is configurable via `HAL_ENDPOINT` (default: `https://api.archives-ouvertes.fr`); the SWORD collection URL is derived as `HAL_ENDPOINT` + `/sword/hal/`.

---

### Case 1 — Article without attached file (XML-only deposit)

- **Request**: `POST` with the TEI-XML body, `Content-Type: text/xml`
- **Packaging header**: `http://purl.org/net/sword-types/AOfr`
- **Response**: `HTTP 202`
- The deposit is **immediately published** — no moderation step.
- The response body is an Atom entry containing the HAL identifier, deposit password, version, and a link to the public page.

Example request:

```bash
curl -v -X POST -d @art.xml \
  -u <service-login>:<service-password> \
  https://api-preprod.archives-ouvertes.fr/sword/hal/ \
  -H "Packaging:http://purl.org/net/sword-types/AOfr" \
  -H "Content-Type:text/xml" \
  -H "On-Behalf-Of: login|marvin;idhal|arthur-dent"
```

Example response body:

```xml
<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:sword="http://purl.org/net/sword/terms/"
       xmlns:hal="http://hal.archives-ouvertes.fr">
  <title>Accepted media deposit to HAL</title>
  <id>hal-03701711</id>
  <hal:password><![CDATA[#******]]></hal:password>
  <hal:version>1</hal:version>
  <updated>2026-06-10T08:35:26+02:00</updated>
  <summary>A media deposit was stored in the HAL workspace</summary>
  <sword:treatment>stored in HAL workspace</sword:treatment>
  <link rel="alternate" href="https://hal.halpreprod.archives-ouvertes.fr/hal-xyz"/>
</entry>
```

Fields to extract and store: `<id>` (HAL identifier), `<hal:password>`, `<hal:version>`, href value in `<link rel="alternate">` (public URL).

The document's internal UID is sent as `monogr/idno[@type="localRef"]` in the TEI before submission.

---

### Case 2 — Article with attached file(s) (ZIP deposit)

- **Request**: `POST` with a ZIP archive, `Content-Type: application/zip`
- **Packaging header**: `http://purl.org/net/sword-types/AOfr`
- **`Content-Disposition`**: `attachment; filename=art.xml`
- **Response**: `HTTP 201`
- The deposit enters **moderation** (`verify` status) — it is not immediately public.

The ZIP archive must contain the TEI-XML file and all attached files (main + complementary). The TEI must reference each attached file with a matching `target`:

```xml
<ref type="file" target="doc.pdf" subtype="author" n="1"/>
```

Build the ZIP (no directory paths):

```bash
zip -j art.zip art.xml doc.pdf
```

Example request:

```bash
curl -v -X POST \
  --data-binary @art.zip \
  -u <service-login>:<service-password> \
  https://api-preprod.archives-ouvertes.fr/sword/hal/ \
  -H "Packaging:http://purl.org/net/sword-types/AOfr" \
  -H "Content-Type:application/zip" \
  -H "Content-Disposition: attachment; filename=art.xml" \
  -H "On-Behalf-Of: login|marvin;idhal|arthur-dent"
```

Response headers include a `Location` with the public HAL URL. Response body is the same Atom entry format as Case 1.

Because the deposit is under moderation, SoVisuPlus stores the result with `verify` status and the user can trigger a manual status refresh from the UI.

---

### Deposit status polling

After a ZIP deposit, the status can be checked on demand via:

```bash
curl -v -u <service-login>:<service-password> \
  https://api-preprod.archives-ouvertes.fr/sword/<hal-id>
```

Response (`HTTP 200`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<document id="hal-03701713" version="1" password="?#*****">
  <status>verify</status>
  <comment></comment>
</document>
```

Expected status values:

| Status    | Meaning                        |
| --------- | ------------------------------ |
| `verify`  | Under moderation               |
| `accept`  | Online / public                |
| `update`  | Changes requested by moderator |
| `delete`  | Refused                        |
| `replace` | Replaced by another version    |

The listener also polls `verify` deposits automatically at a very long interval. The user can trigger an immediate status refresh from the UI independently of this background loop.

---

## Architecture

### HAL credentials

**SWORD basic auth** uses a single application-level service account configured via environment variables:

- `HAL_SERVICE_ACCOUNT_LOGIN`
- `HAL_SERVICE_ACCOUNT_PASSWORD`

**`On-Behalf-Of` header** identifies the person on whose behalf the deposit is made. **The deposit is always made on behalf of the current perspective's person, not necessarily the logged-in user:**

- In **self perspective** (a researcher viewing their own perspective), the On-Behalf-Of person is the logged-in user.
- In a **visited perspective** (e.g. a librarian who has switched to a researcher's `Person` perspective), the On-Behalf-Of person is the **visited** person.

So `HalDeposit.personUid` = the perspective's `Person`, and the eligibility/identifier checks below all apply to **that** person — not to the authenticated user. The perspective also gates feature availability (see access-control gates).

The header is composed from two of that person's stored identifiers:

- `login|` → `PersonIdentifierType.hal_login`
- `idhal|` → `PersonIdentifierType.idhals` (preferred) or `PersonIdentifierType.idhali` (both accepted by HAL)

ORCID is **not** included — HAL does not accept it in this header.

A person is only eligible to be deposited on behalf of if they have **both** `hal_login` and `idhals`/`idhali` stored. These are provisioned via the CAS authentication flow (`HalLoginButton` → `/api/cas/login`).

---

### Data model

#### `HalDeposit`

One document can have multiple deposit attempts (1-n).

| Field                | Type      | Notes                                                                                  |
| -------------------- | --------- | -------------------------------------------------------------------------------------- |
| `id`                 | int PK    |                                                                                        |
| `documentUid`        | FK        | The document being deposited                                                           |
| `personUid`          | FK        | The perspective's person the deposit is made on behalf of                              |
| `status`             | enum      | See lifecycle below                                                                    |
| `halId`              | string?   | e.g. `hal-03701711`, returned by SWORD                                                 |
| `halPassword`        | string?   | Returned by SWORD, needed for future PUT                                               |
| `halVersion`         | int?      | Returned by SWORD                                                                      |
| `halUrl`             | string?   | Public HAL URL from `<link rel="alternate">`                                           |
| `startedAt`          | datetime? | Set when status transitions to `running`; used to detect stale deposits                |
| `retryCount`         | int       | Number of failed (retryable) SWORD attempts; starts at 0                               |
| `nextRetryAt`        | datetime? | Earliest time for the next attempt; null means try immediately                         |
| `lastError`          | string?   | Last SWORD error message, for debugging                                                |
| `refreshRequestedAt` | datetime? | Set by the refresh endpoint to request an on-demand status check; cleared once handled |
| `createdAt`          | datetime  |                                                                                        |
| `updatedAt`          | datetime  |                                                                                        |

This table lists only the lifecycle columns. `HalDeposit` **also** stores the form's deposit metadata (`halDocumentType`, `halDomains`, `language`, and the per-type conditional fields) — those columns are defined in [Deposit-specific metadata stored on `HalDeposit`](#deposit-specific-metadata-stored-on-haldeposit) below, alongside their TEI mapping, rather than duplicated here.

#### `HalDepositFile`

Attached files for a deposit (0-n per deposit). One file is flagged as main; the rest are complementary. The HAL deposit form carries the source, type, visibility and license **per file**, so these are stored on `HalDepositFile` (not on `HalDeposit`).

| Field          | Type     | Notes                                                                                                                         |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`           | int PK   |                                                                                                                               |
| `halDepositId` | FK       |                                                                                                                               |
| `filePath`     | string   | Path on disk within the uploads mount                                                                                         |
| `fileName`     | string   | Original filename, used as `target` in TEI and ZIP                                                                            |
| `isMain`       | boolean  | True for the primary PDF; false for complementary                                                                             |
| `mimeType`     | string   |                                                                                                                               |
| `fileSource`   | string   | File's source code → TEI `ref/@subtype` (`author`, `greenPublisher`, `publisherAgreement`, `publisherPaid`)                   |
| `fileType`     | string   | File's type code → TEI `ref/@type` (`file`, `src`, `annex`)                                                                   |
| `visibility`   | string   | Embargo option (`now`, `15d`, `1m`, `3m`, `6m`, `1y`, `2y`); the listener emits the embargo as a `<date notBefore>` child of the file's `<ref>`, dated deposit date + offset (`now` → no date) |
| `license`      | string?  | CC/ETALAB/Copyright code → TEI `availability/licence/@target`; required for the main file, nullable for complementary         |
| `createdAt`    | datetime |                                                                                                                               |

#### Deposit status lifecycle

```
pending ──► running ──► accept              (XML-only, HTTP 202, no moderation)
                   └──► verify ──► accept   (ZIP, HTTP 201, after moderation)
                              ├──► update
                              ├──► delete
                              └──► replace

running ──► pending   (retryable failure: network / HAL offline / 5xx / 408 / 429)
running ──► error     (terminal failure: non-retryable 4xx — invalid TEI, bad credentials, …)
running ──► pending   (stale recovery on listener restart)
```

`error` is a **terminal** state: the deposit is not retried automatically; `lastError` carries the reason and is surfaced in the UI. The user can fix the cause and create a new deposit.

---

#### DAO Layer

All interactions with database model should pass through the DAO layer. A HalDepositDAO should be created with necessary methods to interact with HalDeposit and HalDepositFile model. extended-client.ts and DocumentDAO should be updated to include `deposits` relation.
The DocumentGraphQLClient shouldn't be touched as there is no HalDeposit and HalDepositFile in the graph. DocumentService should be the go-between the route API and the HalDepositDAO as we will need to access deposits through a Document - methods used by route should be implemented in this class.

### File storage

Two directories are mounted into the Docker container as volumes:

| Directory            | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `uploads/hal-files/` | User-uploaded attachment files                         |
| `uploads/hal-tei/`   | TEI XML and ZIP archives built by `HalDepositPackager` |

Files under `uploads/hal-tei/` are organised per deposit: `uploads/hal-tei/<depositId>/art.xml` and `uploads/hal-tei/<depositId>/art.zip`.

File cleanup strategy is deferred to a later iteration.

---

### Web process additions

#### Deposit creation endpoint

`POST /api/hal/deposits`

Accepts a **multipart form** containing both deposit metadata fields and the file(s). In a single atomic operation:

- Creates the `HalDeposit` row with `status: pending`, linked to the document and to the **perspective person** (`personUid`, the person the deposit is made on behalf of — see HAL credentials), which the request carries.
- Writes each uploaded file to `uploads/hal-files/<depositId>/<filename>` and creates the corresponding `HalDepositFile` rows (with their `fileSource`, `fileType`, `visibility`, `license`). At most one file may be flagged `isMain: true`.

Authorization: requires `deposit_hal` permission for the perspective person, plus that person must have both `hal_login` and `idhals`/`idhali` identifiers stored. The endpoint also rejects deposits when: the submitted document type is not `enabled` in `halDepositFormConfig`; the document has no `publicationDate`; no author has a HAL-recognized affiliation; (for `ART`) the document has no `journal`; any `required` field for the type (per `halDepositFormConfig`) is missing; or (for `THESE`/`HDR`) the document does not have both a French and an English title (either one missing) or both a French and an English set of keywords, or (for `THESE` only) both a French and an English abstract (either one missing), or no main file was uploaded (`requiresMainFile`). The same validations the form runs client-side are re-checked here from the shared config.

#### Status refresh endpoint

`POST /api/hal/deposits/:depositId/refresh`

Enqueues an on-demand status check. It sets `refreshRequestedAt = NOW()` on the deposit and returns immediately; the actual HAL poll is performed by the listener (which clears the flag once handled). Allowed for deposits in `verify`, `update`, or `delete` — not just `verify` — because a moderator's decision can change after the fact and the user may also act directly on HAL, so they need to re-pull the current status on demand. The listener picks up flagged rows on a **short interval** (independent of the long background verify loop) so the refresh feels immediate.

---

### Deposit processing classes

The deposit business logic is **not** implemented inline in the listener script. It lives in dedicated classes under `src/app/lib/services/hal/`, so it is unit-testable in isolation and the listener only schedules calls into it. The decomposition is:

#### `HalSwordClient`

Pure HTTP layer over the SWORD API — no database access, no domain logic. Reads `HAL_ENDPOINT` (deriving the SWORD collection URL as `HAL_ENDPOINT` + `/sword/hal/`), `HAL_SERVICE_ACCOUNT_LOGIN`, `HAL_SERVICE_ACCOUNT_PASSWORD` from the environment. Two methods:

- `deposit(payload)` — POSTs either the XML body (`Content-Type: text/xml`) or the ZIP (`Content-Type: application/zip` + `Content-Disposition`), with the `Packaging` and `On-Behalf-Of` headers. Returns the raw HTTP status code and body.
- `getStatus(halId)` — GETs `<endpoint>/<halId>` and returns the raw body.

It is the only class that performs network I/O against HAL.

#### `HalSwordResponseParser`

Parses HAL's XML responses into typed objects — no I/O. One method parses the Atom entry returned by a deposit (`<id>`, `<hal:password>`, `<hal:version>`, `href` of `<link rel="alternate">`); another parses the `<document>` status response (`status`, `comment`). Kept separate from `HalSwordClient` so parsing can be tested against fixtures.

#### `HalDepositPackager`

Turns a deposit and its `HalDepositFile` rows into the on-disk artifacts under `uploads/hal-tei/<depositId>/`. It:

- Calls `HalTEIInterchangeService.toHalTEI()`, passing `halDeposit.halDocumentType` as `options.halDocumentType` (the conversion from `document.documentType` is only the fallback when this field is absent) and the other deposit-specific overrides.
- Injects the document UID as `monogr/idno[@type="localRef"]`.
- When files exist, injects one `<ref .../>` element per file (with `@type` `file`/`src`/`annex` and `@subtype` the file source — see the file block) and builds `art.zip` (copying from `uploads/hal-files/`); otherwise writes only `art.xml`.

Returns a descriptor (payload location, content type, xml-vs-zip) consumed by `HalSwordClient`. This class owns all filesystem concerns.

#### `HalOnBehalfOfBuilder`

Builds the `On-Behalf-Of` header value from a person's stored identifiers (`hal_login` → `login|…`, `idhals`/`idhali` → `idhal|…`; ORCID excluded). Returns `null` when the person lacks the required identifiers, so callers can fail fast.

#### `HalDepositService`

The orchestrator and single entry point the listener (and the refresh endpoint) call. It holds the business logic and depends on `HalDepositDAO`, `HalDepositPackager`, `HalSwordClient`, `HalSwordResponseParser`, `HalOnBehalfOfBuilder`, and a `WebSocketNotifier` (injected, as `ActionDispatchService` is given its AMQP connection). Public methods:

- `processDuePendingDeposits()` — see the pending-deposit algorithm below.
- `recoverStaleDeposits()` — stale recovery (below).
- `pollVerifyDeposits()` — background `verify`-status polling (below).
- `processRefreshRequests()` — on-demand status refreshes signalled by the refresh endpoint (below).

Private helper `computeNextRetryAt(retryCount)` implements the backoff formula.

##### Pending deposit algorithm (`processDuePendingDeposits`)

Loads `HalDeposit` rows with `status: pending` where `nextRetryAt IS NULL OR nextRetryAt <= NOW()` via `HalDepositDAO`. For each:

1. Atomically claim the deposit: set `status = running` and record `startedAt` via a **conditional update guarded on `status = pending`** (see _Claiming / locking_ below). If the claim updates no row, another worker already took it — skip.
2. Build the artifacts with `HalDepositPackager` (XML-only when there are no files — Case 1; ZIP when there are — Case 2).
3. Submit with `HalSwordClient` using the service account credentials and the `On-Behalf-Of` header from `HalOnBehalfOfBuilder`.
4. Parse the response with `HalSwordResponseParser`; update `HalDeposit` with `halId`, `halPassword`, `halVersion`, `halUrl`, and the new `status` (`accept` for HTTP 202, `verify` for HTTP 201). Reset `retryCount` and `nextRetryAt` to null.
5. On failure, classify the error:
   - **Retryable** — network error, HAL offline, HTTP 5xx, 408, 429: increment `retryCount`, compute `nextRetryAt` via exponential backoff (see below), store `lastError`, set `status` back to `pending`.
   - **Terminal** — any other non-retryable 4xx (invalid TEI, bad service credentials, missing/invalid On-Behalf-Of, etc.): set `status = error`, store `lastError`, leave `nextRetryAt` null. Not retried automatically.
6. Broadcast a WebSocket event via the notifier so the UI updates in real time.

###### Claiming / locking

The `running` status **is** the lock: the pending→running transition is a single conditional `UPDATE … WHERE id = ? AND status = 'pending'`, so only one worker can claim a given row and a submission that outlasts the poll interval cannot be picked up twice. Stale recovery (below) is the safety net that releases a `running` row if the worker dies mid-request.

##### Stale deposit recovery (`recoverStaleDeposits`)

Any `HalDeposit` with `status: running` is reset to `pending` with `nextRetryAt` set according to its current `retryCount`. This handles listener crashes mid-request. Called once on listener startup and then periodically: a deposit stuck in `running` for more than **10 minutes** is considered stale and reset.

##### Exponential retry backoff (`computeNextRetryAt`)

HAL can be offline for hours. After each failed SWORD attempt, `nextRetryAt` is set to:

```
delay = min(2^retryCount minutes, 240 minutes)   // caps at 4 hours
nextRetryAt = now + delay
```

| `retryCount` | Delay before next attempt |
| ------------ | ------------------------- |
| 0            | 1 min                     |
| 1            | 2 min                     |
| 2            | 4 min                     |
| 3            | 8 min                     |
| 4            | 16 min                    |
| 5            | 32 min                    |
| 6+           | 4 h (capped)              |

There is no hard maximum retry count for **retryable** failures — the deposit stays `pending` and keeps retrying until it either succeeds or, if a later attempt hits a non-retryable error, moves to the terminal `error` state. (There is no manual-cancel action in this iteration.)

##### Verify status polling (`pollVerifyDeposits`)

Background loop on a **long** interval. Loads `HalDeposit` rows with `status: verify`, calls `HalSwordClient.getStatus()` for each, parses with `HalSwordResponseParser`, updates `status`, and broadcasts a WebSocket event if the status changed.

##### On-demand refresh (`processRefreshRequests`)

Short-interval loop. Loads `HalDeposit` rows where `refreshRequestedAt IS NOT NULL` (status in `verify`/`update`/`delete`), calls `HalSwordClient.getStatus()`, updates `status`, clears `refreshRequestedAt`, and broadcasts a WebSocket event if the status changed. This is what makes the UI "refresh status" button feel immediate, independent of the long background loop.

### Listener additions

A new fourth subsystem `startHalDepositPoller` is added to `src/scripts/listener.ts` alongside the existing three. It is a **thin scheduler** — it owns no business logic, mirroring how `startChangePoller` delegates to `ActionDispatchService`. It instantiates `HalDepositService` and:

- Calls `recoverStaleDeposits()` once on startup.
- Runs a short-interval loop calling `processDuePendingDeposits()` and `processRefreshRequests()` (re-running `recoverStaleDeposits()` periodically to catch the 10-minute stale case).
- Runs a long-interval loop calling `pollVerifyDeposits()`.

---

---

## UI

The deposit UI is a tab panel on the document page (`/[lang]/documents/[uid]`), rendered as a dedicated tab component (`HalDeposit`).
Mockup is available at [mockup path]/blob/main/src/app/[lang]/documents/[uid]/components/HalDeposit/HalDeposit.tsx. Use the mockup only to get an idea of the layout and visual details — never for component's architecture, types, data formats or interaction logic.

### Access control gates (shown before the form)

The component checks the following conditions before rendering the form. All are checked server-side in the API route; the UI mirrors these checks client-side for UX only. The "person" below is the **current perspective's person** (the logged-in user in self perspective, or the visited person in a librarian's visited perspective — see HAL credentials).

| Condition                                                                                     | UI response                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current perspective is not a `Person`, or the user lacks `deposit_hal` for that person        | The HalDeposit tab is hidden                                                                                                                                                                                                                                                                                                      |
| Has permission but the perspective person is missing `hal_login` or `idhals`/`idhali`         | Info alert inviting the user to link the HAL account to the institutional account, with a direct link to the account page (`/[lang]/account`). No form is shown.                                                                                                                                                                  |
| Has permission and HAL identifiers, but document has no `publicationDate`                     | Info alert: "This document has no publication date. Please add one before depositing." with a link to the Bibliographic information tab (`?tab=bibliographic_information`). No form is shown. The deposit creation endpoint also rejects such deposits server-side.                                                               |
| No author has at least one affiliation with a HAL-recognized identifier (RNSR/ROR/ISNI/IdRef) | Error alert: "No author has an affiliation with a complying HAL identifier. Please go to the Author tab to complete the information." with a link to the Authors tab (`?tab=authors`). No form is shown. Also enforced server-side.                                                                                               |

> The **ART missing-journal rule is _not_ a form-hiding gate.** The form is shown for every document type. The deposit type is **pre-filled from the document's own (CERIF→HAL) type** (falling back to the first enabled type when the mapping is too coarse to be depositable), and the user can refine it. Only when `ART` is the selected type and the document has no `journal` does an inline warning appear (in the Bibliographic information section) and the **Review button is disabled**; for any non-`ART` type there is no journal requirement at all. It is still rejected server-side (`missing_journal`, ART-only). Journal editing in the Bibliographic information tab (with ISSN autocompletion) is a later iteration.

> The **THESE/HDR bilingual-title, bilingual-abstract and bilingual-keywords rules are _not_ form-hiding gates** — unlike the rows above, the form is still shown. They are handled inline in Step 1 (see the read-only Title/abstract section): the form stays visible, an alert appears in the relevant section, and the **Review button is disabled** until both a French and an English title **and** a French and an English set of keywords exist (and, **for `THESE` only**, both a French and an English abstract — an HDR does not require an abstract). They are still rejected server-side (`missing_bilingual_title` / `missing_bilingual_abstract` / `missing_bilingual_keywords`) as a safety net.

If the user doesn't have hal_login or idhals/idhali, the tab should displays following text : `A HAL login or identifier is necessary to perform a submission. If you would like to do so, please complete your HAL information on the MyAccount page.` and a button bellow 'Go to My Account' that opens the MyAccount page.
Otherwise, the UI behaves according to following description.

### Three-steps workflow

#### Step 1 — Form

The form is pre-populated from the document's existing data where possible.

**Read-only sections** (data pulled from other tabs, with a link to edit there):

- **Bibliographic information** (from the _Bibliographic information_ tab) — a single read-only card showing the title, abstract, **publication date** and **journal title** (the journal row is shown only when the document has one). **For `THESE`/`HDR`, both a French and an English title _and_ a French and an English set of keywords are required; a French and an English abstract are additionally required for `THESE` only (an `HDR` does not require an abstract).** When any required item is missing, the form is **still shown**, but a warning alert appears at the top of this card (inviting the user to add the missing title/abstract/keywords) and the **Review button is disabled** until the required items exist. The deposit endpoint also rejects such deposits server-side (`missing_bilingual_title` / `missing_bilingual_abstract` / `missing_bilingual_keywords`). None of these fields is an editable deposit field — they must already be present on the document. For `ART` the journal is required (see the inline ART missing-journal check above). Making the journal editable in the Bibliographic information tab (with ISSN autocompletion) is a later iteration.
- Authors and affiliations (from the _Authors_ tab). If any author has affiliations that will be silently dropped at submission time (affiliations with no HAL-recognized identifier), show an inline warning: "Some contributor's affiliations are not recognized by HAL and won't be submitted. Go to Author tab if you want to change it." This is a soft warning — it does not block submission.

Presentation of the read-only sections:

- Each section has a header with a right-aligned **Modify** action button (its label is **bold**) that navigates to the corresponding tab — "Edit in Bibliographic information" → `bibliographic_information`, "Edit in the Authors tab" → `authors`. The body is a neutral grey surface (`#F5F7F6`).
- The **Bibliographic information** section (titled "Bibliographic information") shows the localized title (bold), a 3-line-clamped abstract with "No title provided" / "No abstract provided" fallbacks, then the publication date and — when present — the journal title as small labelled read-only rows.
- The authors section lists contributors **sorted by rank** (ascending). The **rank value is displayed only when it exists** (not null) — never fabricate a positional index. Each row shows the contributor's display name (bold), their role label(s) in parentheses, and their affiliation name(s). The affiliation name uses the organization's `displayNames[0]` (language-tagged organization names are not yet exposed to the client). When there are no contributors, show "No author provided".
- The banner explaining that these fields come from the other tabs is rendered as a **borderless, background-less** info alert (icon + message only), not a filled alert box.
- The form's main heading ("HAL Deposit") is rendered **bold and teal** (`primary.main`).

**Deposit metadata** (editable, submitted with the deposit):

The editable fields below are introduced by a **"Deposit metadata"** section heading, rendered above the document-type selector. The three **section subtitles** — Bibliographic information, Authors, Deposit metadata — share one style: **uppercase**, semibold, letter-spaced, muted colour, with uniform vertical spacing around each (same top/bottom margins). The **file labels** (Main file, Complementary files) are _not_ styled as subtitles — they keep normal casing and the files block is set off by a top divider.

| Field         | Type                      | Required | Notes                                                                                                                                                                                                                                                |
| ------------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document type | Select                    | Yes      | HAL typology (ART, COMM, THESE, HDR, OUV, COUV, REPORT, POSTER). Pre-populated from the CERIF→HAL mapping but the user can refine it — this is the primary purpose of this field, since the internal CERIF typology is coarser than HAL's. |
| HAL domains   | Multi-select autocomplete | Yes (≥1) | Populated from `halDomainsByCode` generated by `generate_hal_domains.ts` → `src/app/types/HalDomains.ts`. The script fetches the authoritative list from the HAL reference API at build/generate time.                                               |
| Language      | Select                    | Yes      | Language of the deposited file (not of the metadata). Must be set explicitly by the user; defaults to French.                                                                                                                                        |

**Conditional fields** (appear based on selected document type):

| Document type            | Extra fields                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ART                      | _(none editable)_ — the journal is read from the document; see the inline ART missing-journal check                                                 |
| OUV                      | _(none)_ — baseline type; unlike `ART` it does not even require a journal                                                                          |
| COUV                     | Book title (required)                                                                                                                              |
| COMM / POSTER | Conference title, city, starting date, country — **all required**. Starting date supports `YYYY`/`YYYY-MM`/`YYYY-MM-DD` precision via the publication-date control (see the conference fields below) |
| REPORT                   | Institution (required) — HAL facet autocomplete (see _Per-type field sources_)                                                                     |
| THESE / HDR              | Issuing body (required) **and** supervisor (required) — main file required + in-form bilingual-title and bilingual-keywords checks, plus a bilingual-abstract check for `THESE` only (see the THESE/HDR rules below)          |

> **Iteration scope.** The first implementation was functional for **ART** (article) end to end. The remaining types — **OUV**, **COUV**, **COMM/POSTER**, **REPORT** and **THESE/HDR** — are **now implemented and enabled**, with their conditional metadata and TEI mapping specified in the sections below.
>
> The **conference starting date** is captured as a calendar field and the **conference country** as a country-code selector mapped to `meeting/country/@key` (both previously deferred — see _Per-type field sources_). The **THESE/HDR supervisor** (thesis advisor / chair of jury) is mapped to `authority[@type="supervisor"]` (previously deferred — see _THESE/HDR supervisor field_).

##### Form configuration

The conditional-fields table above is **not** hard-coded in the component. It is declared once in a dedicated TypeScript config file — `src/app/lib/services/hal/halDepositFormConfig.ts` — so the type→fields mapping and the set of depositable types can evolve without touching the form or the API route. No YAML; a plain typed module.

The config does three things:

1. **Limits which HAL document types are depositable.** A type marked `enabled: false` is omitted from the document-type `Select` and rejected server-side. **All supported types are now enabled** — `ART`, `OUV`, `COUV`, `COMM`, `POSTER`, `REPORT`, `THESE` and `HDR`; the flag remains so a type can be held back for QA with a one-line change.
2. **Declares the type-specific fields and whether each is required or optional.** The base fields (document type, ≥1 domain, language, and — when a main file is attached — its license) are always present and are not part of this per-type map.
3. **Flags type-level requirements that are not a single field** — currently whether the type requires a main file (`requiresMainFile`, true for THESE/HDR). The form and the server validation both read this flag.

Shape (illustrative):

```ts
export type HalFieldKey =
  | 'conferenceTitle'
  | 'conferenceCity'
  | 'conferenceStartDate'
  | 'conferenceCountry'
  | 'institution'
  | 'bookTitle'
  | 'supervisor'
// 'journalName' is intentionally absent — the journal is read from the document, not entered here
// THESE/HDR titles are not fields either — an inline bilingual-title check enforces them (Step 1)

export type HalDepositTypeConfig = {
  enabled: boolean
  requiresMainFile?: boolean
  fields: Partial<Record<HalFieldKey, 'required' | 'optional'>>
}

export const halDepositFormConfig: Record<
  HalDocumentType,
  HalDepositTypeConfig
> = {
  ART: { enabled: true, fields: {} },
  OUV: { enabled: true, fields: {} },
  COUV: { enabled: true, fields: { bookTitle: 'required' } },
  COMM: {
    enabled: true,
    fields: {
      conferenceTitle: 'required',
      conferenceCity: 'required',
      conferenceStartDate: 'required',
      conferenceCountry: 'required',
    },
  },
  POSTER: {
    enabled: true,
    fields: {
      conferenceTitle: 'required',
      conferenceCity: 'required',
      conferenceStartDate: 'required',
      conferenceCountry: 'required',
    },
  },
  REPORT: { enabled: true, fields: { institution: 'required' } },
  // THESE/HDR: the shared `supervisor` field is labelled per type — thesis advisor for THESE,
  // chair of jury for HDR (see the THESE/HDR supervisor field section).
  THESE: {
    enabled: true,
    requiresMainFile: true,
    fields: { institution: 'required', supervisor: 'required' },
  },
  HDR: {
    enabled: true,
    requiresMainFile: true,
    fields: { institution: 'required', supervisor: 'required' },
  },
}
```

The module also exposes small helpers derived from the map (e.g. `enabledHalDocumentTypes()`, `fieldsForType(type)`, `requiredFieldsForType(type)`). **Both the client form and the server-side creation endpoint import this single config** so the rendered fields, the client-side validation, and the server-side validation can never drift apart. If the document's CERIF→HAL pre-mapped type is not `enabled`, the form falls back to the first enabled type (or shows a "not yet supported" notice if none applies).

##### Per-type field sources

Some conditional fields are not plain free-text inputs:

**Conference start date** (COMM / POSTER). Supports **partial precision** — `YYYY`, `YYYY-MM` or `YYYY-MM-DD` — exactly like the document publication date. Reuse the existing publication-date control `PublicationDate.tsx` (`src/app/[lang]/documents/[uid]/components/BibliographicInformation/PublicationDate.tsx`), a year→month→day stepper, or extract its self-contained precision logic into a shared component. Build on the existing utilities in `src/app/utils/publicationDate.ts` (`DatePrecision`, `parsePublicationDate`, `serializePublicationDate`, `formatPublicationDate`) — do not invent a new date format. The value is stored as the partial ISO string on `HalDeposit.conferenceStartDate` and emitted as the **text content** of `meeting/date[@type="start"]` (e.g. `<date type="start">2024-06</date>`), consistent with how the publication `datePub` is emitted.

**Country selector** (COMM / POSTER). Backed by a static, hand-authored TypeScript module (e.g. `src/app/types/HalCountries.ts`) that lists each country's **ISO code** and its **English and French** display names, so the picker can label options in either supported locale. There is no runtime API call — the list is not expected to change. Only the **code** is written to the TEI (`meeting/country/@key`); the name is UI-only. (This may later be replaced by a generated module, following the `generate_hal_domains.ts` → `src/app/types/HalDomains.ts` precedent.)

**Institution autocomplete** (REPORT institution **and** THESE/HDR issuing body — same field, same source). Distinct from the affiliation autocomplete used in the Authors tab (`HalStructureAutocomplete` → `/ref/structure/`). Options come from the HAL facet search, with the user input substituted for `[input]`:

```
https://api.archives-ouvertes.fr/search/?q=*%3A*&rows=0&indent=true&facet=true&facet.field=authorityInstitution_s&facet.limit=30&facet.contains.ignoreCase=true&facet.contains=[input]
```

Read the values at `facet_counts/facet_fields/authorityInstitution_s`. This is a Solr facet array that **interleaves each facet value with its integer count**, so filter to keep **only the string entries** (drop the numbers). The selected string is stored on the deposit and emitted to the TEI at `monogr/authority[@type="institution"]`.

##### THESE/HDR supervisor field

THESE and HDR each require one supervisor — a **thesis advisor** for THESE, a **chair of the jury** for HDR. Both are emitted to the same TEI slot, `monogr/authority[@type="supervisor"]` (content = the person's name). The field is **labelled per type**: "Thesis supervisor" / "Directeur / Directrice de thèse" for THESE, "Jury president" / "Président du jury" for HDR.

The picker is a **select** whose options are **only** the document's contributors (`Document.contributions`, each a `Contribution { person, roles: LocRelator[] }`) whose `roles` include the relevant relator — `LocRelator.THESIS_ADVISOR` for THESE, `LocRelator.DEGREE_COMMITTEE_MEMBER` for HDR. Contributors without that role are **not** listed. When **exactly one** contributor holds the relevant role, that contributor is **selected by default** (the user can still change it; a manual choice is never overwritten).

If **no** contributor holds the relevant role, the options are replaced by a message prompting the user to add a contributor with the relevant role (or tag an existing contributor with it) before a supervisor can be selected.

The selected contributor is stored on `HalDeposit.supervisor` as the **display name**, which is emitted as the `authority[@type="supervisor"]` content. No `idHal` is persisted or emitted in this iteration.

**File upload** (at the bottom of the form):

- **Main file** (PDF): one file. Triggers a ZIP deposit (Case 2 in SWORD section). When omitted, the deposit is a metadata-only **notice** (XML-only, Case 1). It is **optional for every type except THESE/HDR**, where it is **required** (`requiresMainFile` in the form config): those types always produce a ZIP/moderated deposit, the picker carries a required asterisk, and a missing main file blocks submission both client-side and server-side.
- **Complementary files** (optional, multiple): appended to the ZIP alongside the main file.

When at least one file is attached, each file (main **and** complementary) expands a grid of four selectors, with the codes shown in parentheses (UI codes that also drive the TEI — see the TEI mapping section):

| Field           | Type   | Required                                                         | Options (UI code)                                                                                                                                                                                                                 |
| --------------- | ------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File's source   | Select | Yes (default 'Provided by author(s)')                            | Provided by author(s) (`author`), Publisher allowing publisher's file submission (`greenPublisher`), Publisher's express consent for submission (`publisherAgreement`), Funded publication fees for open access (`publisherPaid`) |
| File's type     | Select | Yes (default 'Document')                                         | Document — pdf, jpg… (`file`), Source file — docx, tex… (`src`), Additional data (`annex`). Default `file` for the main file, `annex` for complementary files                                                                     |
| File visibility | Select | Yes (default 'Immediately')                                      | Immediately (`now`), In 15 days (`15d`), In 1 month (`1m`), In 3 months (`3m`), In 6 months (`6m`), In 1 year (`1y`), In 2 years (`2y`)                                                                                           |
| License         | Select | Yes for main file, No for others (no default value in both case) | CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, CC BY-ND, CC BY-NC-ND, ETALAB (Open Licence), Copyright (all rights reserved)                                                                                                             |

The form validates client-side before advancing: document type, language and at least one domain are always required; when a main file is attached its license is also required (complementary files may stay license-less); for THESE/HDR a main file must be attached (`requiresMainFile`). Conditional fields (book title, conference title / city / start date / country, institution / issuing body, supervisor) are required per `halDepositFormConfig` for the selected type. The same checks are re-run server-side on the creation endpoint.

**Required-field markers.** Every field that is required gets a trailing asterisk (` *`) on its label, derived from the Required columns above and from `halDepositFormConfig` (for conditional fields) — **not** from the design mockup. This covers: document type, HAL domains, language, and the per-file source / type / visibility selectors (always required); every conditional field marked `required` for the selected type (book title; conference title / city / start date / country; institution / issuing body; supervisor); and the license selector **only for the main file**. The **main file** carries an asterisk **only for THESE/HDR** (where it is required via `requiresMainFile`); for every other type it is optional and carries no asterisk. The asterisk is a literal character appended in the UI — it is language-neutral and is not part of any translation string.

**File upload affordances.**

- The empty main-file picker button shows a cloud-upload icon (`CloudUpload`); the "Add a complementary file" button shows a plus icon (`Add`).
- Once a file is picked, its row shows a paper-clip icon (`AttachFile`) before the file name, followed by the human-readable file size (B / KB / MB).
- The selected-file box is tinted by role: a **light teal** surface (`#E8F5F4`) for the main file and a **light grey** surface (`#F5F7F6`) for complementary files.

#### Step 2 — Review

A summary of all entered data (document type, domains as chips, conditional fields, file list) is displayed in place before submission. The user can go back to edit or confirm.

#### Step 3 — Uploading / submitted

The pending/running default display is shown while the request is in flight. On completion the component transitions to the corresponding deposit status view.

---

### Deposit status views

In mockup, the DemoSwitcher component is purpose to show what happen according to the deposit status. It shouldn't been included in layout.

The deposit status view is displayed if there is at least one `HalDeposit` row for the document (based on document uid) - the person uid doesn't matter here - and no source record with platform of type `BibliographicPlatform.HAL` in document's records. If there is more than one deposit, the one with the most recent `updatedAt` field's value should be used.

Once the publication is live on HAL and harvested back, a `BibliographicPlatform.HAL` source record arrives via the graph (RabbitMQ message) and lands in the document's records; at that point the condition above becomes false and the status panel is replaced. The form is **not** re-shown by SoVisuPlus on its own after a deposit exists — a general re-deposit action (returning to the form) is deferred to a later iteration.

Once a deposit exists, the form is replaced by a status panel keyed on `HalDeposit.status`. Each view shows the status, submission date and the HAL identifier with a link to the public HAL page when available. The "refresh status" button calls `POST /api/hal/deposits/:depositId/refresh`.

| Status                | Icon / colour     | Message                                    | Actions        |
| --------------------- | ----------------- | ------------------------------------------ | -------------- |
| `pending` / `running` | Info, blue        | Deposit queued or in progress              | —              |
| `verify`              | Hourglass, orange | Under moderation (1–5 working days)        | Refresh status |
| `accept`              | Checkmark, green  | Published on HAL; public URL shown         | —              |
| `update`              | Warning, orange   | Moderator requested changes; comment shown | Refresh status |
| `delete`              | Error, red        | Rejected; rejection reason shown           | Refresh status |
| `replace`             | Info, grey        | Replaced by another version                | —              |
| `error`               | Error, red        | Submission failed; `lastError` shown       | —              |

A general **"Re-deposit"** action (start a fresh deposit) is **deferred to a later iteration** — it is not specific to any status. In this iteration the only action offered on `verify`/`update`/`delete` is "Refresh status".

These two statuses mean the deposit is **stuck on the HAL side**, and crucially **no HAL source record is harvested while a deposit sits in them**:

- `update` — HAL is waiting for the contributor to apply the requested changes **directly on HAL**. SoVisuPlus cannot push those changes (PUT is out of scope), so the panel stays in `update`; "Refresh status" re-pulls the status after the user has acted on HAL. Only once HAL accepts does it move to `accept` and a source record is eventually harvested (then the panel is replaced — see the display rule below).
- `delete` — the deposit was rejected. This is effectively terminal for this iteration: no source record will ever be harvested, and there is no re-deposit yet, so the panel keeps showing the rejection reason.

---

### Deposit-specific metadata stored on `HalDeposit`

The form fields that are not already on the `Document` model must be persisted on `HalDeposit` so the listener can use them when generating the TEI:

| Field                          | Column                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| HAL document type (refined)    | `halDocumentType` (string)                                                          |
| HAL domain codes               | `halDomains` (string array / JSON)                                                 |
| Language                       | `language` (string)                                                                |
| Conference title               | `conferenceTitle` (string?)                                                         |
| Conference city                | `conferenceCity` (string?)                                                          |
| Conference start date          | `conferenceStartDate` (string?) — partial ISO 8601 (`YYYY` / `YYYY-MM` / `YYYY-MM-DD`), same format as the document publication date |
| Conference country             | `conferenceCountry` (string?) — stores the **ISO country code**, not the name      |
| Institution / issuing body     | `institution` (string?)                                                            |
| Book title                     | `bookTitle` (string?)                                                               |
| Supervisor (THESE/HDR)         | `supervisor` (string?) — selected contributor's display name (emitted as the `authority[@type="supervisor"]` content; no `idHal` stored this iteration) |

The **journal is not stored here** — it lives on the `Document` (`document.journal`) and `toHalTEI` reads it directly. License, file source, file type and visibility are **per file** and live on `HalDepositFile`. THESE/HDR titles are not stored either — they come from `Document.titles` and are guarded by the inline bilingual-title check.

`HalTEIInterchangeService.toHalTEI()` will need to be extended to accept these deposit-specific overrides in addition to the base `DocumentClass`. `HalTEIOptions` (currently `{ domains, language, halDocumentType }`) is widened to carry `conferenceTitle`, `conferenceCity`, `conferenceStartDate`, `conferenceCountry`, `institution`, `bookTitle`, `supervisor`, and the per-file descriptors (source, type, visibility, license — see below). The journal is **not** an option — it already comes from `document.journal`.

#### TEI mapping of deposit metadata (AOfr profile)

Element paths below are taken from the AOfr schema (`aofr.xsd`) and confirmed against real preprod deposits. All elements are in the TEI namespace; `<biblFull>` children must keep schema order: `titleStmt`, `editionStmt`, `publicationStmt`, `seriesStmt`, `notesStmt`, `sourceDesc`, `profileDesc`.

`<monogr>` children must likewise follow the XSD sequence: `idno`, `title` (journal `level="j"` / book `level="m"`), `meeting`, `respStmt`, `settlement`, `country`, `editor`, `imprint`, `authority` (institution then supervisor). The packager already emits the journal `title` + `imprint`; the new `meeting` and `authority` elements must be **inserted at their schema position**, not appended — HAL rejects out-of-order children. (Inside `<meeting>` the order is `title`, `date`, `settlement`, `country`.)

> **`<notesStmt>` metadata notes are not emitted in this iteration.** The official example deposits carry notes such as `audience`, `peerReviewing`, `popularLevel`, `invitedCommunication` and `proceedings` marked "%%mandatory", but HAL only requires them when the depositor adds publication comments — which is out of scope here. SoVisuPlus omits the `<notesStmt>` metadata notes; they are not forgotten fields.

| Field                     | TEI location                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| HAL document type         | `profileDesc/textClass/classCode[@scheme="halTypology"]/@n` _(already emitted)_                                                      |
| HAL domains               | `profileDesc/textClass/classCode[@scheme="halDomain"]/@n` (one per domain) _(already emitted)_                                       |
| Language (of the file)    | `profileDesc/langUsage/language/@ident` _(already emitted)_                                                                          |
| License (per file)        | `publicationStmt/availability/licence/@target` = the CC/ETALAB URL (see table); one `<licence>` per distinct file license            |
| Journal name (ART)        | `sourceDesc/biblStruct/monogr/title[@level="j"]` — read from `document.journal` (already emitted by `toHalTEI`), not a deposit field |
| Book title (COUV)         | `sourceDesc/biblStruct/monogr/title[@level="m"]` (same slot as the ART journal, which uses `level="j"`)                              |
| Conference title (COMM/…) | `sourceDesc/biblStruct/monogr/meeting/title`                                                                                         |
| Conference city           | `sourceDesc/biblStruct/monogr/meeting/settlement`                                                                                    |
| Conference start date     | `sourceDesc/biblStruct/monogr/meeting/date[@type="start"]` — partial ISO value as **element text** (`<date type="start">YYYY[-MM[-DD]]</date>`), matching how `datePub` is emitted (not the `@when` attribute) |
| Conference country        | `sourceDesc/biblStruct/monogr/meeting/country/@key` = the ISO country code (the name is UI-only and **not** emitted)                  |
| Institution / issuing body (REPORT / THESE / HDR) | `sourceDesc/biblStruct/monogr/authority[@type="institution"]`                                                    |
| Supervisor (THESE thesis advisor / HDR chair of jury) | `sourceDesc/biblStruct/monogr/authority[@type="supervisor"]` (content = the person's name) — the required supervisor field for THESE/HDR |
| Publication date (THESE / HDR) | `monogr/imprint/date[@type="datePub"]` **and** `monogr/imprint/date[@type="dateDefended"]`, both set to the document's publication date (for a thesis the publication date is the defense date). Other types emit only `datePub`. |
| Attached files            | `editionStmt/edition/ref` (see file block; `@type` = `file`/`src`/`annex`)                                                           |
| File embargo / visibility | `editionStmt/edition/ref/date/@notBefore` — a `<date>` **child of each file's `<ref>`** (XSD: "%embargo sur chaque fichier")          |
| Document internal UID     | `sourceDesc/biblStruct/monogr/idno[@type="localRef"]` with the document UID (injected by the packager)                               |

**License → `@target` URL** (`availability/licence/@target`):

| UI value    | `@target`                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| CC BY       | `http://creativecommons.org/licenses/by/4.0/`                                                                              |
| CC BY-SA    | `http://creativecommons.org/licenses/by-sa/4.0/`                                                                           |
| CC BY-NC    | `http://creativecommons.org/licenses/by-nc/4.0/`                                                                           |
| CC BY-NC-SA | `http://creativecommons.org/licenses/by-nc-sa/4.0/`                                                                        |
| CC BY-ND    | `http://creativecommons.org/licenses/by-nd/4.0/`                                                                           |
| CC BY-NC-ND | `http://creativecommons.org/licenses/by-nc-nd/4.0/`                                                                        |
| ETALAB      | _To confirm_ against HAL's licence reference list                                                                          |
| Copyright   | _To confirm_ — likely **no** `<licence>` element (closed/copyright is expressed differently); resolve before relying on it |

**File block** — files and their embargo live in `editionStmt/edition`. Each file is one `<ref>` whose `@type` is the file kind (`file` for a document, `src` for a source file, `annex` for additional data) and `@subtype` is the file source; the per-file embargo date (derived from the file-visibility delay relative to the deposit date) is a **child** `<date notBefore="…">` of that `<ref>` (confirmed against the official SWORD examples):

```xml
<editionStmt>
  <edition>
    <ref type="file" target="doc.pdf" subtype="author" n="1">       <!-- main file (Document) -->
      <date notBefore="2026-12-24"/>                                <!-- omitted when visibility = now -->
    </ref>
    <ref type="annex" target="data.csv" subtype="author" n="2"/>    <!-- complementary (Additional data), no embargo -->
  </edition>
</editionStmt>
```

- `target` = the file's `fileName` (no path — files are zipped with `zip -j`).
- `@type` = the **file type** code (`file` / `src` / `annex`), from `HalDepositFile.fileType`.
- `@subtype` = the **file source** code (`author` / `greenPublisher` / `publisherAgreement` / `publisherPaid`), from `HalDepositFile.fileSource`.
- `n` = 1-based sequence index.
- `@notBefore` (embargo) maps from `HalDepositFile.visibility`: `now` → no `<date>` child; `15d / 1m / 3m / 6m / 1y / 2y` → a `<date notBefore="…">` child of the file's `<ref>`, dated deposit date + offset. The embargo date is always a child of the `<ref>` it applies to (per the official examples), so each file carries its own embargo independently.
- **License** is per file (`HalDepositFile.license`). Structurally the AOfr schema only exposes `publicationStmt/availability/licence` (document-level), but `<licence>` is repeatable with `@target` and may contain `<ref>` elements pointing back to specific files. **The exact per-file association is the one remaining open point** — confirm against HAL before relying on more than one distinct license per deposit; the article-first case (single main PDF) needs only one `<licence>`.

---

### RBAC

A new `deposit_hal` permission action is added. It follows the existing scoped RBAC model:

- A researcher can deposit their own publications (scoped to their own `Person`).
- A librarian or laboratory manager can deposit publications on behalf of others (scoped to a `ResearchUnit`, `Institution`, etc., or globally).

The deposit trigger endpoint checks `ability.can(PermissionAction.deposit_hal, perspectivePerson)` server-side (the perspective person — see HAL credentials). Having `hal_login` + `idhals`/`idhali` is a data prerequisite checked separately — it is not a substitute for the RBAC check.
