# Make the publication date editable in BibliographicInformation

## Context

On the document details page, the **Bibliographic information** card lets users edit most
fields inline (titles, abstracts, type, …) but the **publication date** was read-only. It
must become editable like the others. The publication date is stored as a flexible string
(`Document.publicationDate: string | null`, `publicationDate String?` in Prisma), so it can
carry three precisions: a **year** (`2024`), a **month + year** (`2024-05`), or a **full
date** (`2024-05-12`). The editor must let the user choose any of these via a calendar-like
control.

This file records the session's instructions, in order, so the work can be replayed. Each
numbered prompt is an instruction the user gave; the bullet(s) under it capture the decision
that was made and applied.

---

## Instruction 1 — make the date field editable

> Make the date field in BibliographicInformation editable like the other ones. A date can be
> a year, a month-year tuple, or a full date; it should be possible to choose any of these
> formats via a calendar kind of UI control.

Implementation (backend + helpers, all still current):

- **Storage convention:** partial ISO 8601 — `YYYY` / `YYYY-MM` / `YYYY-MM-DD`. Precision is
  recovered by counting dash-separated segments.
- **Helper** `src/app/utils/publicationDate.ts` (+ unit test): `parsePublicationDate`,
  `serializePublicationDate`, `formatPublicationDate` (precision- and locale-aware;
  uses `LocaleDateFormats`; extends dayjs `customParseFormat` for strict parsing).
- **Store action** `modifyPublicationDate(publicationDate: string | null)` in
  `documentSlice.ts` (mirrors `modifyTitles`: PUT + optimistic update).
- **API route** `src/app/api/documents/[uid]/publicationDate/route.ts` (PUT): auth, format
  validation (`^\d{4}(-\d{2}(-\d{2})?)?$` + valid dayjs), `ability.can(update, document,
  'publicationDate')`, then `documentService.updatePublicationDate`.
- **Service** `DocumentService.updatePublicationDate` + **DAO**
  `DocumentDAO.updatePublicationDateByUid` (mirror the `documentType` flow; emit an `UPDATE`
  `Action` with `path: 'publicationDate'`, `parameters: { value }`).
- **RBAC:** add `publicationDate` to the `document_editor` role's `update` fields in
  `rbac.roles.yaml` **and** the tracked `rbac.roles.sample.yaml`; reseed with
  `npm run init_roles`.
- **Wiring:** `BibliographicInformation.tsx` injects `setAlert` into the `date` field entry;
  `PublicationDate.tsx` becomes the display + edit component.

> Graph-sync note: `ActionDispatchService` forwards `{ path, parameters }` generically; the
> external graph consumer must handle `path: 'publicationDate'`. Watch for a document stuck
> in `waiting_for_update` after a date edit.

---

## Instruction 2 — calendar icon button + choosable precision

> 1. The edit button should be a calendar icon button instead of the outlined "Modify" button.
> 2. It must be possible to select only a year (the auto-advancing single calendar made that
>    impossible, and the view-switch arrow was confusing). Prefer selecting year, then month,
>    then day, with the ability to select/deselect to come back to a year or year-month date.

- Edit affordance → an `EditCalendar` `IconButton` in a `Tooltip`, with `aria-label` =
  `document_details_page_publication_date_row_edit_button`, kept inside the `<Can I={update}
  field='publicationDate'>` gate and `disabled` when `selectedDocument.isFrozen`.
- Decision (asked & chosen): **progressive chips** model over `YearCalendar` /
  `MonthCalendar` / day-only `DateCalendar` (one single-level grid at a time, no auto-advance,
  no view-switch arrow). *(Superseded by Instruction 3.)*

---

## Instruction 3 — replace chips with a stepper

> Rather than chips, use steps: clicking a next step adds the deeper date level, clicking a
> previous step removes the level. Also, when entering a level, no value should "seem"
> selected.

- Replace chips/`+Month`/`+Day` with a MUI `Stepper` (steps **Year → Month → Day**) using
  `nonLinear` + `StepButton`. State: `value: Dayjs | null`, `precision` (deepest **confirmed**
  level — serialized), `activeStep` (shown grid).
- `canGoTo(i)`: backward/current always; the immediate next only once the current level is
  chosen (`value != null`); no skipping. `goToStep`: backward/current sets `precision = STEPS[i]`
  (drops deeper levels); next leaves `precision` (new level unconfirmed).
- **No preselection on a newly added level:** the grid receives `value` only when
  `index(activeStep) <= index(precision)`, else `null`; always pass `referenceDate={value ??
  dayjs()}` so the blank grid still opens at the right year/month.
- Decision (asked & chosen): going **back** keeps that step's value (still selected) and only
  drops deeper levels.
- i18n: replaced `..._add_month` / `..._add_day` with step labels `..._step_year` /
  `..._step_month` / `..._step_day` (Year/Month/Day, Année/Mois/Jour).

---

## Instruction 4 — four UX refinements

> 1. The icon button should have a rounded border, consistent with the page's other edit buttons.
> 2. No checkmarks when passing to another step.
> 3. Auto-advance to the next step after selecting a value.
> 4. Remove the arrows in the day grid, since year and month are already chosen in earlier steps.

- IconButton matches the theme `outlined` Button: `border: 1px solid #6F7977`,
  `borderRadius: 100px`, `color: primary.main`.
- Removed `completed` from `<Step>` (no checkmarks).
- `onYearPick` → `setActiveStep('month')`; `onMonthPick` → `setActiveStep('day')`; day stays.
  The advanced step is still blank (precision unchanged until a pick), so year/month-only
  still serialize correctly.
- Day `DateCalendar`: hide `previousIconButton` / `nextIconButton` via `slotProps`
  (`display: none`).

---

## Instruction 5 — final colour fixes

> 1. A previous step should stay in the selected colour (teal) rather than grey (grey looks
>    disabled).
> 2. The selected day value should also be teal (it looked lighter, as if pre-selected).

- Custom `StepDot` icon node: teal (`primary.main`) for reached steps (`i <= activeIndex`),
  grey otherwise; white number; rendering a node also keeps checkmarks suppressed. Reached
  step labels use `text.primary`.
- Day `DateCalendar`: `disableHighlightToday` + force `.MuiPickersDay-root.Mui-selected` to
  solid `primary.main` / white (held through hover/focus).

---

## Files

- `src/app/utils/publicationDate.ts` (+ `publicationDate.test.ts`)
- `src/app/[lang]/documents/[uid]/components/BibliographicInformation/PublicationDate.tsx`
  (+ `PublicationDate.test.tsx`)
- `src/app/[lang]/documents/[uid]/components/BibliographicInformation/BibliographicInformation.tsx`
- `src/app/stores/documentSlice.ts`
- `src/app/api/documents/[uid]/publicationDate/route.ts`
- `src/app/lib/services/DocumentService.ts`, `src/app/lib/daos/DocumentDAO.ts`
- `rbac.roles.yaml` (gitignored) + `rbac.roles.sample.yaml`
- `src/locales/{en,fr}/messages.po` (+ generated `messages.js`)
- Test-mock updates: `src/app/stores/global_store.test.ts`,
  `src/app/lib/websocket/WebSocketListener.test.tsx`

## Verification

- `npx tsc --noEmit` and `npx next lint` clean for the touched files.
- `npx jest PublicationDate.test BibliographicInformation.test` → green (29 tests). Note: the
  component path contains `[lang]`/`[uid]`, which jest reads as a regex — use a plain pattern
  like `npx jest PublicationDate.test`, not the bracketed path.
- i18n: `npm run i18n:extract` then fill new `msgstr` in `src/locales/{en,fr}/messages.po`,
  then `npm run i18n:compile`. Never hand-edit non-extracted `.po` entries or the generated
  `.js`.
- Manual (dev-tls, HTTPS) as a `document_editor`: open a document detail page; the calendar
  icon button (rounded border) opens the stepper; picking a year auto-advances to a blank
  Month step, then to a blank Day step (no arrows); previous steps stay teal; the selected
  day is solid teal; Apply stores `YYYY` / `YYYY-MM` / `YYYY-MM-DD` and persists across reload.
  Clean up local footprints afterwards (restore edited documents, delete audit `Action` rows,
  stop the dev server, remove temp files).
