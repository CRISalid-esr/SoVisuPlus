import type { I18n, MessageDescriptor } from '@lingui/core'
import { nationalTypeLabel } from './organizationTypeLabels'

// Unit tests for the national organization type label lookup.
const i18n = {
  _: (descriptor: MessageDescriptor) => `translated:${descriptor.id}`,
} as unknown as I18n

describe('nationalTypeLabel', () => {
  it('returns null for an empty code', () => {
    expect(nationalTypeLabel(i18n, null)).toBeNull()
    expect(nationalTypeLabel(i18n, undefined)).toBeNull()
    expect(nationalTypeLabel(i18n, '')).toBeNull()
  })

  it('translates a known code whatever its case', () => {
    const upper = nationalTypeLabel(i18n, 'FDR')
    expect(upper).not.toBe('FDR')
    expect(nationalTypeLabel(i18n, 'fdr')).toBe(upper)
    expect(nationalTypeLabel(i18n, 'Ufr')).toBe(nationalTypeLabel(i18n, 'UFR'))
  })

  it('falls back to the raw code for an unknown value', () => {
    expect(nationalTypeLabel(i18n, 'xyz')).toBe('xyz')
  })
})
