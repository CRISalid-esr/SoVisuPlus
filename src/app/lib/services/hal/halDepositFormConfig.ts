/**
 * Declarative configuration of the HAL deposit form: which HAL document types are
 * depositable, and which type-specific fields each one shows (and whether required).
 *
 * This module is the single source of truth shared by the client form and the server-side
 * deposit endpoint, so rendered fields and validation can never drift. It is intentionally
 * free of any React / next imports so both sides can import it.
 *
 * Base fields (document type, >=1 domain, language, and — when a main file is attached — its
 * license) are always present and are NOT part of this per-type map. The journal (ART) is read
 * from the document, not entered here, so it is not a field key either.
 */

export const HAL_DOCUMENT_TYPES = [
  'ART',
  'COMM',
  'POSTER',
  'PRESCONF',
  'THESE',
  'HDR',
  'REPORT',
  'COUV',
  'OUV',
] as const

export type HalDocumentType = (typeof HAL_DOCUMENT_TYPES)[number]

export type HalFieldKey =
  | 'conferenceTitle'
  | 'conferenceCity'
  | 'conferenceStartDate'
  | 'conferenceCountry'
  | 'institution'
  | 'bookTitle'
  | 'supervisor'
// 'journalName' intentionally absent — the journal is read from the document.
// THESE/HDR titles are not field keys either — a bilingual-title gate enforces them.

export type FieldRequirement = 'required' | 'optional'

export type HalDepositTypeConfig = {
  /** Whether this type can be deposited in the current iteration. */
  enabled: boolean
  /**
   * Whether the type always requires a main file (so it is a moderated ZIP deposit).
   * True for THESE/HDR; other types may deposit as an XML-only notice.
   */
  requiresMainFile?: boolean
  /** Type-specific fields to render, with their requirement. */
  fields: Partial<Record<HalFieldKey, FieldRequirement>>
}

/** The four conference fields shared by COMM/POSTER/PRESCONF — all required. */
const conferenceFields: Partial<Record<HalFieldKey, FieldRequirement>> = {
  conferenceTitle: 'required',
  conferenceCity: 'required',
  conferenceStartDate: 'required',
  conferenceCountry: 'required',
}

export const halDepositFormConfig: Record<
  HalDocumentType,
  HalDepositTypeConfig
> = {
  ART: { enabled: true, fields: {} },
  COMM: { enabled: true, fields: { ...conferenceFields } },
  POSTER: { enabled: true, fields: { ...conferenceFields } },
  PRESCONF: { enabled: true, fields: { ...conferenceFields } },
  // THESE/HDR: `supervisor` is labelled per type — thesis advisor for THESE,
  // chair of jury for HDR (see the THESE/HDR supervisor field section of the spec).
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
  REPORT: { enabled: true, fields: { institution: 'required' } },
  COUV: { enabled: true, fields: { bookTitle: 'required' } },
  OUV: { enabled: true, fields: {} },
}

export const isHalDocumentType = (value: string): value is HalDocumentType =>
  (HAL_DOCUMENT_TYPES as readonly string[]).includes(value)

export const isDepositableType = (type: string): boolean =>
  isHalDocumentType(type) && halDepositFormConfig[type].enabled

/** HAL document types currently offered in the form's type selector. */
export const enabledHalDocumentTypes = (): HalDocumentType[] =>
  HAL_DOCUMENT_TYPES.filter((t) => halDepositFormConfig[t].enabled)

export const fieldsForType = (
  type: HalDocumentType,
): Partial<Record<HalFieldKey, FieldRequirement>> =>
  halDepositFormConfig[type].fields

export const requiredFieldsForType = (type: HalDocumentType): HalFieldKey[] =>
  (Object.entries(fieldsForType(type)) as [HalFieldKey, FieldRequirement][])
    .filter(([, req]) => req === 'required')
    .map(([key]) => key)

/** Whether the type must always carry a main file (moderated ZIP deposit). */
export const requiresMainFile = (type: HalDocumentType): boolean =>
  halDepositFormConfig[type].requiresMainFile === true

/**
 * Returns the required conditional field keys whose value is missing/blank in `values`.
 * Shared by the client form and the server route so their validation can never drift.
 */
export const validateConditionalFields = (
  type: HalDocumentType,
  values: Partial<Record<HalFieldKey, string | null | undefined>>,
): HalFieldKey[] =>
  requiredFieldsForType(type).filter((key) => !values[key]?.trim())
