import { resolveLanguage } from './language' // Adjust the import path to where the function is located

describe('resolveLanguage', () => {
  const messages = {
    en: { greeting: 'Hello' },
    fr: { greeting: 'Bonjour' },
  }

  it('returns the correct language and messages for "en"', async () => {
    const params = Promise.resolve({ lang: 'en' })
    const result = await resolveLanguage(params, messages)

    expect(result).toEqual({
      lang: 'en',
      selectedMessages: { greeting: 'Hello' },
    })
  })

  it('returns the correct language and messages for "fr"', async () => {
    const params = Promise.resolve({ lang: 'fr' })
    const result = await resolveLanguage(params, messages)

    expect(result).toEqual({
      lang: 'fr',
      selectedMessages: { greeting: 'Bonjour' },
    })
  })

  it('falls back to "en" if lang is invalid', async () => {
    const params = Promise.resolve({ lang: 'es' }) // 'es' is not defined in messages
    const result = await resolveLanguage(params, messages)

    expect(result).toEqual({
      lang: 'es',
      selectedMessages: { greeting: 'Hello' }, // Fallback to 'en'
    })
  })

  it('handles empty messages gracefully', async () => {
    const params = Promise.resolve({ lang: 'en' })
    const result = await resolveLanguage(params, {})

    expect(result).toEqual({
      lang: 'en',
      selectedMessages: undefined, // No fallback
    })
  })

  it('handles missing lang property in params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = Promise.resolve({ lang: undefined } as any)
    const result = await resolveLanguage(params, messages)

    expect(result).toEqual({
      lang: undefined,
      selectedMessages: { greeting: 'Hello' }, // Fallback to 'en'
    })
  })
})
