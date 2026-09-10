import type { DepositIneligibilityReason } from './validateDepositEligibility'

/**
 * Every reason `POST /api/hal/deposits` can refuse a deposit with.
 *
 * The route attaches one to each failure response and the client maps it to a translated message,
 * so no untranslated server string ever reaches the UI. Eligibility reasons are reused verbatim
 * from the shared validator, which keeps the pre-emptive form gates and the server refusal on the
 * same vocabulary.
 *
 * `missing_field:<HalFieldKey>` is the one parameterised member: the offending field is appended
 * so the message can name it.
 */
export type HalDepositFailureReason =
  | DepositIneligibilityReason
  | 'not_authenticated'
  | 'missing_payload'
  | 'invalid_payload'
  | 'person_not_found'
  | 'forbidden'
  | 'document_not_found'
  | 'missing_main_file'
  | 'multiple_main_files'
  | 'main_file_license_required'
  | 'file_missing_from_upload'
  | 'internal_error'
  | `missing_field:${string}`
