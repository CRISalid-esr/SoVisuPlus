import { getStringInLocale } from '@/utils/getStringInLocale' // Adjust the path if needed
import { Literal } from '@/types/Literal'

describe('getStringInLocale', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'fr,en,es'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = '' // Reset to avoid side effects
  })

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

  it('returns the correct value for a valid localeNumber', () => {
    expect(getStringInLocale(data, 0)).toBe('Bonjour') // fr
    expect(getStringInLocale(data, 1)).toBe('Hello') // en
    expect(getStringInLocale(data, 2)).toBe('Hola') // es
  })

  it('returns an empty string if localeNumber is out of bounds', () => {
    expect(getStringInLocale(data, 5)).toBe('')
  })

  it('falls back to the first available locale if the preferred locale is missing', () => {
    const partialData: Literal[] = [
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
    expect(getStringInLocale(partialData, 0)).toBe('Hola') // No 'fr' or 'en', so it picks 'es'
  })

  it('returns the first available locale if the preferred locale is missing', () => {
    const partialData: Literal[] = [
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
    ]
    expect(getStringInLocale(partialData, 0)).toBe('Hello') // 'fr' is missing, fallback to 'en'
  })

  it('returns the first available value when no locales match', () => {
    const otherData: Literal[] = [
      {
        language: 'de',
        value: 'Hallo',
        normalize: function (): string {
          throw new Error('Function not implemented.')
        },
        toJson: function (): { language: string; value: string } {
          throw new Error('Function not implemented.')
        },
      },
    ]
    expect(getStringInLocale(otherData, 0)).toBe('Hallo') // No match, so first element is used
  })

  it('returns "n/c" if the items array is empty', () => {
    expect(getStringInLocale([], 0)).toBe('n/c')
  })

  it('handles a custom NEXT_PUBLIC_SUPPORTED_LOCALES environment variable', () => {
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'it,de'
    const italianData: Literal[] = [
      {
        language: 'it',
        value: 'Ciao',
        normalize: function (): string {
          throw new Error('Function not implemented.')
        },
        toJson: function (): { language: string; value: string } {
          throw new Error('Function not implemented.')
        },
      },
      {
        language: 'de',
        value: 'Hallo',
        normalize: function (): string {
          throw new Error('Function not implemented.')
        },
        toJson: function (): { language: string; value: string } {
          throw new Error('Function not implemented.')
        },
      },
    ]
    expect(getStringInLocale(italianData, 0)).toBe('Ciao') // Uses 'it' as the first locale
    expect(getStringInLocale(italianData, 1)).toBe('Hallo') // Uses 'de' as the second locale
  })

  it('normalizes the returned string', () => {
    const accentedData: Literal[] = [
      {
        language: 'fr',
        value: 'Élève',
        normalize: function (): string {
          throw new Error('Function not implemented.')
        },
        toJson: function (): { language: string; value: string } {
          throw new Error('Function not implemented.')
        },
      },
    ]
    expect(getStringInLocale(accentedData, 0)).toBe('Élève'.normalize())
  })
})
