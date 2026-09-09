/**
 * UI option lists for the HAL deposit form. The `value` codes are the contract with the server
 * (they flow into the multipart payload and ultimately the TEI). Labels are user-facing and are
 * either a `MessageDescriptor` (translated via the catalog) or a plain string for universal,
 * language-neutral codes (the CC licence names).
 */

import { defineMessage } from '@lingui/core/macro'
import { MessageDescriptor } from '@lingui/core'

export type OptionLabel = string | MessageDescriptor

/**
 * User-facing labels for the depositable HAL document types. The `value` codes are the HAL
 * typology contract (see `HAL_DOCUMENT_TYPES` in `halDepositFormConfig.ts`) and flow into the
 * TEI; only the label is localized. The order mirrors `HAL_DOCUMENT_TYPES`.
 */
export const HAL_DOCUMENT_TYPE_OPTIONS: { value: string; label: OptionLabel }[] =
  [
    { value: 'ART', label: defineMessage`hal_deposit_type_art` },
    { value: 'COMM', label: defineMessage`hal_deposit_type_comm` },
    { value: 'POSTER', label: defineMessage`hal_deposit_type_poster` },
    { value: 'THESE', label: defineMessage`hal_deposit_type_these` },
    { value: 'HDR', label: defineMessage`hal_deposit_type_hdr` },
    { value: 'REPORT', label: defineMessage`hal_deposit_type_report` },
    { value: 'COUV', label: defineMessage`hal_deposit_type_couv` },
    { value: 'OUV', label: defineMessage`hal_deposit_type_ouv` },
  ]

export const LANGUAGE_OPTIONS: { value: string; label: OptionLabel }[] = [
  { value: 'fr', label: defineMessage`hal_deposit_lang_fr` },
  { value: 'en', label: defineMessage`hal_deposit_lang_en` },
  { value: 'es', label: defineMessage`hal_deposit_lang_es` },
  { value: 'de', label: defineMessage`hal_deposit_lang_de` },
  { value: 'it', label: defineMessage`hal_deposit_lang_it` },
  { value: 'pt', label: defineMessage`hal_deposit_lang_pt` },
]

export const LICENSE_OPTIONS: { value: string; label: OptionLabel }[] = [
  { value: 'cc-by', label: 'CC BY 4.0' },
  { value: 'cc-by-sa', label: 'CC BY-SA 4.0' },
  { value: 'cc-by-nc', label: 'CC BY-NC 4.0' },
  { value: 'cc-by-nc-sa', label: 'CC BY-NC-SA 4.0' },
  { value: 'cc-by-nd', label: 'CC BY-ND 4.0' },
  { value: 'cc-by-nc-nd', label: 'CC BY-NC-ND 4.0' },
  { value: 'etalab', label: defineMessage`hal_deposit_license_etalab` },
  { value: 'copyright', label: defineMessage`hal_deposit_license_copyright` },
]

export const FILE_SOURCE_OPTIONS: { value: string; label: OptionLabel }[] = [
  { value: 'author', label: defineMessage`hal_deposit_source_author` },
  { value: 'greenPublisher', label: defineMessage`hal_deposit_source_green_publisher` },
  { value: 'publisherAgreement', label: defineMessage`hal_deposit_source_publisher_agreement` },
  { value: 'publisherPaid', label: defineMessage`hal_deposit_source_publisher_paid` },
]

export const FILE_TYPE_OPTIONS: { value: string; label: OptionLabel }[] = [
  { value: 'file', label: defineMessage`hal_deposit_filetype_document` },
  { value: 'src', label: defineMessage`hal_deposit_filetype_source` },
  { value: 'annex', label: defineMessage`hal_deposit_filetype_annex` },
]

export const VISIBILITY_OPTIONS: { value: string; label: OptionLabel }[] = [
  { value: 'now', label: defineMessage`hal_deposit_visibility_now` },
  { value: '15d', label: defineMessage`hal_deposit_visibility_15d` },
  { value: '1m', label: defineMessage`hal_deposit_visibility_1m` },
  { value: '3m', label: defineMessage`hal_deposit_visibility_3m` },
  { value: '6m', label: defineMessage`hal_deposit_visibility_6m` },
  { value: '1y', label: defineMessage`hal_deposit_visibility_1y` },
  { value: '2y', label: defineMessage`hal_deposit_visibility_2y` },
]

export const labelOf = (
  options: { value: string; label: OptionLabel }[],
  value: string | null | undefined,
): OptionLabel => options.find((o) => o.value === value)?.label ?? (value ?? '')
