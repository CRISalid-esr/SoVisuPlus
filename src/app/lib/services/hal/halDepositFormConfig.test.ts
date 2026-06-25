import {
  enabledHalDocumentTypes,
  fieldsForType,
  halDepositFormConfig,
  isDepositableType,
  isHalDocumentType,
  requiredFieldsForType,
} from './halDepositFormConfig'

describe('halDepositFormConfig', () => {
  it('enables only ART in the first iteration', () => {
    expect(enabledHalDocumentTypes()).toEqual(['ART'])
    expect(isDepositableType('ART')).toBe(true)
    expect(isDepositableType('COMM')).toBe(false)
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

  it('declares required vs optional fields for conference types', () => {
    expect(requiredFieldsForType('COMM')).toEqual(['conferenceTitle'])
    expect(fieldsForType('COMM').conferenceCity).toBe('optional')
    expect(fieldsForType('COMM').conferenceCountry).toBe('optional')
  })

  it('declares book/institution required fields for the remaining types', () => {
    expect(requiredFieldsForType('COUV')).toEqual(['bookTitle'])
    expect(requiredFieldsForType('THESE')).toEqual(['institution'])
    expect(requiredFieldsForType('REPORT')).toEqual(['institution'])
    expect(requiredFieldsForType('OUV')).toEqual([])
  })

  it('covers every HAL document type in the config map', () => {
    expect(Object.keys(halDepositFormConfig).sort()).toEqual(
      ['ART', 'COMM', 'COUV', 'HDR', 'OUV', 'POSTER', 'PRESCONF', 'REPORT', 'THESE'].sort(),
    )
  })
})
