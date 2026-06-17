# 838 — Automated HAL deposit

## HAL SWORD deposit

### Overview

The TEI-XML conversion from the internal database schema is already implemented (`HalTEIInterchangeService`). This feature adds the HTTP layer that submits documents to HAL via the SWORD API, plus the database entities and async infrastructure needed to manage the deposit lifecycle.

**Scope for this iteration: POST only** (new deposits). PUT (updating an existing HAL record) is deferred — it requires downloading the existing XML-TEI from HAL, pushing a new version, and using a HAL account with impersonation rights.

The SWORD endpoint is configurable via `HAL_SWORD_ENDPOINT` (default: `https://api-preprod.archives-ouvertes.fr/sword/hal/`).

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

The document's internal UID is sent as `<idno type="localRef">` in the TEI before submission.

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

**`On-Behalf-Of` header** identifies the person on whose behalf the deposit is made. It is composed from two of the person's stored identifiers:

- `login|` → `PersonIdentifierType.hal_login`
- `idhal|` → `PersonIdentifierType.idhals` (preferred) or `PersonIdentifierType.idhali` (both accepted by HAL)

ORCID is **not** included — HAL does not accept it in this header.

A person is only eligible to be deposited on behalf of if they have **both** `hal_login` and `idhals`/`idhali` stored. These are provisioned via the CAS authentication flow (`HalLoginButton` → `/api/cas/login`).

---

### Data model

#### `HalDeposit`

One document can have multiple deposit attempts (1-n).

| Field         | Type      | Notes                                                                   |
| ------------- | --------- | ----------------------------------------------------------------------- |
| `id`          | int PK    |                                                                         |
| `documentUid` | FK        | The document being deposited                                            |
| `personUid`   | FK        | The person who triggered the deposit (for On-Behalf-Of)                 |
| `status`      | enum      | See lifecycle below                                                     |
| `halId`       | string?   | e.g. `hal-03701711`, returned by SWORD                                  |
| `halPassword` | string?   | Returned by SWORD, needed for future PUT                                |
| `halVersion`  | int?      | Returned by SWORD                                                       |
| `halUrl`      | string?   | Public HAL URL from `<link rel="alternate">`                            |
| `startedAt`   | datetime? | Set when status transitions to `running`; used to detect stale deposits |
| `retryCount`  | int       | Number of failed SWORD attempts; starts at 0                            |
| `nextRetryAt` | datetime? | Earliest time for the next attempt; null means try immediately          |
| `lastError`   | string?   | Last SWORD error message, for debugging                                 |
| `createdAt`   | datetime  |                                                                         |
| `updatedAt`   | datetime  |                                                                         |

#### `HalDepositFile`

Attached files for a deposit (0-n per deposit). One file is flagged as main; the rest are complementary.

| Field          | Type     | Notes                                              |
| -------------- | -------- | -------------------------------------------------- |
| `id`           | int PK   |                                                    |
| `halDepositId` | FK       |                                                    |
| `filePath`     | string   | Path on disk within the uploads mount              |
| `fileName`     | string   | Original filename, used as `target` in TEI and ZIP |
| `isMain`       | boolean  | True for the primary PDF; false for complementary  |
| `mimeType`     | string   |                                                    |
| `createdAt`    | datetime |                                                    |

#### Deposit status lifecycle

```
pending ──► running ──► accept    (XML-only, HTTP 202, no moderation)
                   └──► verify ──► accept
                              ├──► update
                              ├──► delete
                              └──► replace

running ──► pending   (stale recovery on listener restart)
```

---

### File storage

Two directories are mounted into the Docker container as volumes:

| Directory            | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `uploads/hal-files/` | User-uploaded attachment files                     |
| `uploads/hal-tei/`   | TEI XML and ZIP archives generated by the listener |

Files under `uploads/hal-tei/` are organised per deposit: `uploads/hal-tei/<depositId>/art.xml` and `uploads/hal-tei/<depositId>/art.zip`.

File cleanup strategy is deferred to a later iteration.

---

### Web process additions

#### Deposit creation endpoint

`POST /api/hal/deposits`

Accepts a **multipart form** containing both deposit metadata fields and the file(s). In a single atomic operation:

- Creates the `HalDeposit` row with `status: pending`, linked to the document and the authenticated person.
- Writes each uploaded file to `uploads/hal-files/<depositId>/<filename>` and creates the corresponding `HalDepositFile` rows. At most one file may be flagged `isMain: true`.

Authorization: requires `deposit_hal` permission for the target person, plus the person must have both `hal_login` and `idhals`/`idhali` identifiers stored.

#### Status refresh endpoint

`POST /api/hal/deposits/:depositId/refresh`

Enqueues an on-demand status check for a `verify` deposit. The actual HAL poll is executed by the listener; this endpoint signals the intent (e.g. sets a `refreshRequestedAt` flag or similar mechanism TBD).

---

### Listener additions

A new fourth subsystem `startHalDepositPoller` is added to `src/scripts/listener.ts` alongside the existing three.

#### Pending deposit processor

Polls the database at short intervals for `HalDeposit` rows with `status: pending` where `nextRetryAt IS NULL OR nextRetryAt <= NOW()`.

For each pending deposit:

1. Set `status = running`, record `startedAt`.
2. Generate TEI XML via `HalTEIInterchangeService.toHalTEI()`. Inject `<idno type="localRef">` with the document UID. Write to `uploads/hal-tei/<depositId>/art.xml`.
3. Fetch `HalDepositFile` rows for the deposit.
   - If none: XML-only deposit (Case 1).
   - If any: copy files from `uploads/hal-files/` into a ZIP alongside the TEI (Case 2). Inject `<ref type="file" .../>` elements into the TEI for each file before zipping.
4. Submit to HAL SWORD API using the service account credentials and the person's `On-Behalf-Of` header.
5. Parse the Atom response; update `HalDeposit` with `halId`, `halPassword`, `halVersion`, `halUrl`, and the new `status` (`accept` for HTTP 202, `verify` for HTTP 201). Reset `retryCount` and `nextRetryAt` to null.
6. On SWORD failure (network error, HAL offline, unexpected HTTP status): increment `retryCount`, compute `nextRetryAt` using exponential backoff (see below), store `lastError`, set `status` back to `pending`.
7. Broadcast a WebSocket event so the UI updates in real time.

#### Stale deposit recovery

On listener startup, any `HalDeposit` with `status: running` is reset to `pending` with `nextRetryAt` set according to its current `retryCount`. This handles listener crashes mid-request. The same logic runs periodically: a deposit stuck in `running` for more than **10 minutes** is considered stale and reset.

#### Exponential retry backoff

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

There is no hard maximum retry count — the deposit stays `pending` indefinitely until it either succeeds or is manually cancelled.

#### Verify status poller

Polls the database at a long interval for `HalDeposit` rows with `status: verify`. For each, calls the HAL SWORD status endpoint, updates `status`, and broadcasts a WebSocket event if the status changed. Also handles on-demand refresh requests (see web process above).

---

---

## UI

The deposit UI is a tab panel on the document page (`/[lang]/documents/[uid]`), rendered as a dedicated tab component (`HalDeposit`).
Mockup is available at [mockup path]/blob/main/src/app/[lang]/documents/[uid]/components/HalDeposit/HalDeposit.tsx. Use the mockup only to get an idea of the layout and visual details — never for component's architecture, types, data formats or interaction logic.

### Access control gates (shown before the form)

The component checks two conditions before rendering the form. Both are checked server-side in the API route; the UI mirrors these checks client-side for UX only.

| Condition                                                           | UI response                                                                                                                                                          |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User does not have `deposit_hal` permission for this document       | The HalDeposit tab is hidden                                                                                                                                         |
| User has permission but is missing `hal_login` or `idhals`/`idhali` | Info alert inviting the user to link their HAL account to their institutional account, with a direct link to the account page (`/[lang]/account`). No form is shown. |

If the user doesn't have hal_login or idhals/idhali, the tab should displays following text : `A HAL login or identifier is necessary to perform a submission. If you would like to do so, please complete your HAL information on the MyAccount page.` and a button bellow 'Go to My Account' that opens the MyAccount page.
Otherwise, the UI behaves according to following description.

### Three-steps workflow

#### Step 1 — Form

The form is pre-populated from the document's existing data where possible.

**Read-only sections** (data pulled from other tabs, with a link to edit there):

- Title and abstract (from the _Bibliographic information_ tab)
- Authors and affiliations (from the _Authors_ tab)

**Deposit metadata** (editable, submitted with the deposit):

| Field         | Type                      | Required | Notes                                                                                                                                                                                                                                                |
| ------------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document type | Select                    | Yes      | HAL typology (ART, COMM, THESE, HDR, OUV, COUV, REPORT, POSTER, PRESCONF). Pre-populated from the CERIF→HAL mapping but the user can refine it — this is the primary purpose of this field, since the internal CERIF typology is coarser than HAL's. |
| HAL domains   | Multi-select autocomplete | Yes (≥1) | Populated from `halDomainsByCode` generated by `generate_hal_domains.ts` → `src/app/types/HalDomains.ts`. The script fetches the authoritative list from the HAL reference API at build/generate time.                                               |
| Language      | Select                    | Yes      | Pre-populated from document. French should be prefered if available                                                                                                                                                                                  |
| Date          | Date                      | Yes      | Label is context-sensitive: "Publication date" (ART/OUV/COUV), "Date of the defense" (THESE/HDR), "Conference starting date" (COMM/POSTER/PRESCONF). Pre-populated from `document.publicationDate`.                                                  |
| License       | Select                    | Yes      | CC BY, CC BY-SA, CC BY-ND, CC BY-NC, CC BY-NC-ND, CC0.                                                                                                                                                                                               |

**Conditional fields** (appear based on selected document type):

| Document type            | Extra fields                                                  |
| ------------------------ | ------------------------------------------------------------- |
| ART                      | Journal name (required)                                       |
| COMM / POSTER / PRESCONF | Conference title (required), city, country                    |
| THESE / HDR              | Issuing body (required); director / jury president (required) |
| REPORT                   | Institution (required)                                        |
| COUV                     | Book title (required)                                         |

**File upload** (at the bottom of the form):

- **Main file** (PDF, required): one file. Triggers a ZIP deposit (Case 2 in SWORD section).
- **Complementary files** (optional, multiple): appended to the ZIP alongside the main file.

The form validates client-side before advancing: document type, at least one domain, and main file are all required (journal/conference/etc. required conditionally per type).

#### Step 2 — Review

A summary of all entered data (document type, domains as chips, conditional fields, file list) is displayed before submission. The user can go back to edit or confirm.

#### Step 3 — Uploading / submitted

A progress indicator is shown while the request is in flight. On completion the component transitions to the deposit status view.

---

### Deposit status views

In mockup, the DemoSwitcher component is purpose to show what happen according to the deposit status. It shouldn't been included in layout.

The deposit status view is displayed if there is at least one `HalDeposit` row for the document (based on document uid) - the person uid doesn't matter here - and no source record with platform of type `BibliographicPlatform.hal` in document's records. If there is more than one deposit, the one with the most recent `updatedAt` field's value should be used.

Once a deposit exists, the form is replaced by a status panel keyed on `HalDeposit.status`. Each view shows the status, submission date, the HAL identifier with a link to the public HAL page when available, and a "refresh status" button (calls `POST /api/hal/deposits/:depositId/refresh`).

| Status                | Icon / colour     | Message                                    | Actions                     |
| --------------------- | ----------------- | ------------------------------------------ | --------------------------- |
| `pending` / `running` | Spinner, grey     | Deposit queued or in progress              | —                           |
| `verify`              | Hourglass, orange | Under moderation (1–5 working days)        | Refresh status              |
| `accept`              | Checkmark, green  | Published on HAL; public URL shown         | —                           |
| `update`              | Warning, orange   | Moderator requested changes; comment shown | Re-deposit (resets to form) |
| `delete`              | Error, red        | Rejected; rejection reason shown           | Re-deposit (resets to form) |
| `replace`             | Info, grey        | Replaced by another version                | —                           |

---

### Deposit-specific metadata stored on `HalDeposit`

The form fields that are not already on the `Document` model must be persisted on `HalDeposit` so the listener can use them when generating the TEI:

| Field                       | Column                                          |
| --------------------------- | ----------------------------------------------- |
| HAL document type (refined) | `halDocumentType` (string)                      |
| HAL domain codes            | `halDomains` (string array / JSON)              |
| Language                    | `language` (string)                             |
| License                     | `license` (string)                              |
| Production date             | `productionDate` (string)                       |
| Journal name                | `journalName` (string?)                         |
| Conference title            | `conferenceTitle` (string?)                     |
| Conference city / country   | `conferenceCity`, `conferenceCountry` (string?) |
| Institution                 | `institution` (string?)                         |
| Director / jury president   | `director` (string?)                            |
| Book title                  | `bookTitle` (string?)                           |

`HalTEIInterchangeService.toHalTEI()` will need to be extended to accept these deposit-specific overrides in addition to the base `DocumentClass`.

---

### RBAC

A new `deposit_hal` permission action is added. It follows the existing scoped RBAC model:

- A researcher can deposit their own publications (scoped to their own `Person`).
- A librarian or laboratory manager can deposit publications on behalf of others (scoped to a `ResearchUnit`, `Institution`, etc., or globally).

The deposit trigger endpoint checks `ability.can(PermissionAction.deposit_hal, targetPerson)` server-side. Having `hal_login` + `idhals`/`idhali` is a data prerequisite checked separately — it is not a substitute for the RBAC check.
