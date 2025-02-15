import { getLocalizedValue } from '@/utils/getLocalizedValue'
import { Literal } from '@/types/Literal'

describe('getLocalizedValue', () => {
  const fr = new Literal('Bonjour', 'fr')
  const en = new Literal('Hello', 'en')
  const es = new Literal('Hola', 'es')
  const data: Literal[] = [fr, en, es]

  it('returns the value in the preferred language if available', () => {
    expect(getLocalizedValue(data, 'fr', ['es', 'en'], 'Default').value).toBe(
      'Bonjour',
    )
  })

  it('returns the value in the first fallback language if preferred is missing', () => {
    expect(getLocalizedValue(data, 'de', ['fr', 'en'], 'Default').value).toBe(
      'Bonjour',
    )
  })

  it('returns the value in the second fallback language if both preferred and first fallback are missing', () => {
    expect(getLocalizedValue(data, 'de', ['it', 'en'], 'Default').value).toBe(
      'Hello',
    )
  })

  it('returns the default value if no matching language is found', () => {
    expect(getLocalizedValue(data, 'de', ['ru', 'cn'], 'Default').value).toBe(
      'Default',
    )
  })

  it('returns the default value if data is empty', () => {
    expect(getLocalizedValue([], 'en', ['fr', 'es'], 'Default').value).toBe(
      'Default',
    )
  })

  it('returns the exact match even if fallback languages exist', () => {
    expect(getLocalizedValue(data, 'es', ['fr', 'en'], 'Default').value).toBe(
      'Hola',
    )
  })
})
