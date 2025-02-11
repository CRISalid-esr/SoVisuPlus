import { getLocalizedValue } from '@/utils/getLocalizedValue' // Adjust path if needed
import { Literal } from '@/types/Literal'

describe('getLocalizedValue', () => {
  const data: Literal[] = [
    {
      language: 'en',
      value: 'Hello',
      normalize: function (): string {
        throw new Error('Function not implemented.')
      },
      toJson: function (): { language: string; value: string } {
        throw new Error('Function not implemented.')
      },
    },
    {
      language: 'fr',
      value: 'Bonjour',
      normalize: function (): string {
        throw new Error('Function not implemented.')
      },
      toJson: function (): { language: string; value: string } {
        throw new Error('Function not implemented.')
      },
    },
    {
      language: 'es',
      value: 'Hola',
      normalize: function (): string {
        throw new Error('Function not implemented.')
      },
      toJson: function (): { language: string; value: string } {
        throw new Error('Function not implemented.')
      },
    },
  ]

  it('returns the value in the preferred language if available', () => {
    expect(getLocalizedValue(data, 'fr', ['es', 'en'], 'Default')).toBe(
      'Bonjour',
    )
  })

  it('returns the value in the first fallback language if preferred is missing', () => {
    expect(getLocalizedValue(data, 'de', ['fr', 'en'], 'Default')).toBe(
      'Bonjour',
    )
  })

  it('returns the value in the second fallback language if both preferred and first fallback are missing', () => {
    expect(getLocalizedValue(data, 'de', ['it', 'en'], 'Default')).toBe('Hello')
  })

  it('returns the default value if no matching language is found', () => {
    expect(getLocalizedValue(data, 'de', ['ru', 'cn'], 'Default')).toBe(
      'Default',
    )
  })

  it('returns the default value if data is empty', () => {
    expect(getLocalizedValue([], 'en', ['fr', 'es'], 'Default')).toBe('Default')
  })

  it('returns the exact match even if fallback languages exist', () => {
    expect(getLocalizedValue(data, 'es', ['fr', 'en'], 'Default')).toBe('Hola')
  })
})
