import { DocumentType } from '@prisma/client'
import {
  defaultHalDocumentType,
  enabledHalDocumentTypes,
  fieldsForType,
  halDepositFormConfig,
  isDepositableType,
  isHalDocumentType,
  requiredFieldsForType,
  requiresMainFile,
  validateConditionalFields,
} from './halDepositFormConfig'

describe('halDepositFormConfig', () => {
  it('enables every supported document type', () => {
    expect(enabledHalDocumentTypes().sort()).toEqual(
      [
        'ART',
        'COMM',
        'COUV',
        'HDR',
        'OUV',
        'POSTER',
        'REPORT',
        'THESE',
      ].sort(),
    )
    expect(isDepositableType('ART')).toBe(true)
    expect(isDepositableType('COMM')).toBe(true)
    expect(isDepositableType('THESE')).toBe(true)
  })

  it('rejects unknown document types', () => {
    expect(isHalDocumentType('ART')).toBe(true)
    expect(isHalDocumentType('NOPE')).toBe(false)
    expect(isDepositableType('NOPE')).toBe(false)
  })

  it('exposes no editable conditional field for ART (journal comes from the document)', () => {
    expect(fieldsForType('ART')).toEqual({})
    expect(requiredFieldsForType('ART')).toEqual([])
  })

  it('requires all four conference fields for COMM/POSTER', () => {
    for (const type of ['COMM', 'POSTER'] as const) {
      expect(requiredFieldsForType(type).sort()).toEqual(
        [
          'conferenceCity',
          'conferenceCountry',
          'conferenceStartDate',
          'conferenceTitle',
        ].sort(),
      )
    }
  })

  it('declares book/institution/supervisor required fields for the remaining types', () => {
    expect(requiredFieldsForType('COUV')).toEqual(['bookTitle'])
    expect(requiredFieldsForType('REPORT')).toEqual(['institution'])
    expect(requiredFieldsForType('THESE').sort()).toEqual(
      ['institution', 'supervisor'].sort(),
    )
    expect(requiredFieldsForType('HDR').sort()).toEqual(
      ['institution', 'supervisor'].sort(),
    )
    expect(requiredFieldsForType('OUV')).toEqual([])
  })

  it('flags THESE/HDR as requiring a main file, others not', () => {
    expect(requiresMainFile('THESE')).toBe(true)
    expect(requiresMainFile('HDR')).toBe(true)
    expect(requiresMainFile('ART')).toBe(false)
    expect(requiresMainFile('COMM')).toBe(false)
  })

  it('reports missing required conditional fields', () => {
    expect(validateConditionalFields('COUV', {})).toEqual(['bookTitle'])
    expect(validateConditionalFields('COUV', { bookTitle: '  ' })).toEqual([
      'bookTitle',
    ])
    expect(validateConditionalFields('COUV', { bookTitle: 'A book' })).toEqual(
      [],
    )
    expect(
      validateConditionalFields('THESE', { institution: 'Univ' }).sort(),
    ).toEqual(['supervisor'])
    expect(validateConditionalFields('ART', {})).toEqual([])
  })

  it('pre-fills the deposit type from the document type when it maps to a depositable type', () => {
    expect(defaultHalDocumentType(DocumentType.Article)).toBe('ART')
    expect(defaultHalDocumentType(DocumentType.JournalArticle)).toBe('ART')
    expect(defaultHalDocumentType(DocumentType.ConferenceArticle)).toBe('COMM')
    expect(defaultHalDocumentType(DocumentType.Presentation)).toBe('COMM')
    expect(defaultHalDocumentType(DocumentType.Book)).toBe('OUV')
    expect(defaultHalDocumentType(DocumentType.BookChapter)).toBe('COUV')
  })

  it('falls back to the first enabled type when the mapped type is not depositable', () => {
    // ScholarlyPublication → UNDEFINED, Proceedings → PROCEEDINGS: neither is depositable.
    expect(defaultHalDocumentType(DocumentType.ScholarlyPublication)).toBe('ART')
    expect(defaultHalDocumentType(DocumentType.Proceedings)).toBe('ART')
  })

  it('covers every HAL document type in the config map', () => {
    expect(Object.keys(halDepositFormConfig).sort()).toEqual(
      [
        'ART',
        'COMM',
        'COUV',
        'HDR',
        'OUV',
        'POSTER',
        'REPORT',
        'THESE',
      ].sort(),
    )
  })
})
