import { t } from '@lingui/core/macro'
import type { HalFieldKey } from '@/lib/services/hal/halDepositFormConfig'

/**
 * Turns the `reason` returned by `POST /api/hal/deposits` into a translated message.
 *
 * The route's `error` string is English and log-facing, so it is never shown as-is; `reason` is
 * the contract the UI translates. Eligibility reasons deliberately reuse the gate message ids, so
 * a server refusal reads exactly like the pre-emptive gate for the same condition.
 *
 * `halDocumentType` is only consulted for `missing_field:supervisor`, whose label differs between
 * a THESE (thesis advisor) and an HDR (committee member).
 */

/** Label message for each conditional field, mirroring the form's own field labels. */
const fieldLabel = (key: string, halDocumentType?: string): string => {
  switch (key as HalFieldKey) {
    case 'conferenceTitle':
      return t`hal_deposit_field_conference_title`
    case 'conferenceCity':
      return t`hal_deposit_field_conference_city`
    case 'conferenceStartDate':
      return t`hal_deposit_field_conference_start_date`
    case 'conferenceCountry':
      return t`hal_deposit_field_conference_country`
    case 'institution':
      return t`hal_deposit_field_institution`
    case 'bookTitle':
      return t`hal_deposit_field_book_title`
    case 'supervisor':
      return halDocumentType === 'HDR'
        ? t`hal_deposit_field_supervisor_hdr`
        : t`hal_deposit_field_supervisor_these`
    default:
      // An unknown key is still worth naming: better a raw field name than a blank message.
      return key
  }
}

export const describeHalDepositFailure = (
  reason: string | undefined,
  halDocumentType?: string,
): string => {
  if (reason?.startsWith('missing_field:')) {
    const field = fieldLabel(
      reason.slice('missing_field:'.length),
      halDocumentType,
    )
    return t`hal_deposit_error_missing_field ${field}`
  }

  switch (reason) {
    // ─── Eligibility (shared with the form gates) ────────────────────────────
    case 'type_not_depositable':
      return t`hal_deposit_error_type_not_depositable`
    case 'missing_identifiers':
      return t`hal_deposit_gate_no_idhal`
    case 'missing_publication_date':
      return t`hal_deposit_gate_no_date`
    case 'missing_journal':
      return t`hal_deposit_gate_no_journal`
    case 'missing_bilingual_title':
      return t`hal_deposit_gate_missing_bilingual_title`
    case 'missing_bilingual_abstract':
      return t`hal_deposit_gate_missing_bilingual_abstract`
    case 'missing_bilingual_keywords':
      return t`hal_deposit_gate_missing_bilingual_keywords`
    case 'no_hal_affiliation':
      return t`hal_deposit_gate_no_affiliation`

    // ─── Files ───────────────────────────────────────────────────────────────
    case 'missing_main_file':
      return t`hal_deposit_error_missing_main_file`
    case 'multiple_main_files':
      return t`hal_deposit_error_multiple_main_files`
    case 'main_file_license_required':
      return t`hal_deposit_error_main_file_license_required`
    case 'file_missing_from_upload':
      return t`hal_deposit_error_file_missing_from_upload`

    // ─── Request / authorization ─────────────────────────────────────────────
    case 'not_authenticated':
      return t`hal_deposit_error_not_authenticated`
    case 'forbidden':
      return t`hal_deposit_error_forbidden`
    case 'person_not_found':
      return t`hal_deposit_error_person_not_found`
    case 'document_not_found':
      return t`hal_deposit_error_document_not_found`
    case 'missing_payload':
    case 'invalid_payload':
      return t`hal_deposit_error_invalid_payload`
    case 'internal_error':
      return t`hal_deposit_error_internal`

    default:
      // No reason (network failure, or a reason added server-side that this build predates).
      return t`hal_deposit_error_failed`
  }
}
