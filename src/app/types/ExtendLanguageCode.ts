import ISO6391, { LanguageCode } from 'iso-639-1'

type ExtendedLanguageCode = LanguageCode | 'ul'

export const isExtendedLanguageCode = (v: unknown): v is ExtendedLanguageCode =>
  typeof v === 'string' && (v === 'ul' || ISO6391.validate(v))

export type { ExtendedLanguageCode }
