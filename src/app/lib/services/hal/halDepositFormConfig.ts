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
  | 'conferenceCountry'
  | 'institution'
  | 'bookTitle'
// 'journalName' intentionally absent — the journal is read from the document.
// 'director' intentionally absent — deferred to a later iteration.

export type FieldRequirement = 'required' | 'optional'

export type HalDepositTypeConfig = {
  /** Whether this type can be deposited in the current iteration. */
  enabled: boolean
  /** Type-specific fields to render, with their requirement. */
  fields: Partial<Record<HalFieldKey, FieldRequirement>>
}

export const halDepositFormConfig: Record<HalDocumentType, HalDepositTypeConfig> =
  {
    ART: { enabled: true, fields: {} },
    COMM: {
      enabled: false,
      fields: {
        conferenceTitle: 'required',
        conferenceCity: 'optional',
        conferenceCountry: 'optional',
      },
    },
    POSTER: {
      enabled: false,
      fields: {
        conferenceTitle: 'required',
        conferenceCity: 'optional',
        conferenceCountry: 'optional',
      },
    },
    PRESCONF: {
      enabled: false,
      fields: {
        conferenceTitle: 'required',
        conferenceCity: 'optional',
        conferenceCountry: 'optional',
      },
    },
    THESE: { enabled: false, fields: { institution: 'required' } },
    HDR: { enabled: false, fields: { institution: 'required' } },
    REPORT: { enabled: false, fields: { institution: 'required' } },
    COUV: { enabled: false, fields: { bookTitle: 'required' } },
    OUV: { enabled: false, fields: {} },
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
