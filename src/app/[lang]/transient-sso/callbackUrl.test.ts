import { resolveCallbackUrl } from './callbackUrl'

describe('resolveCallbackUrl', () => {
  it('defaults to the dashboard of the current locale', () => {
    expect(resolveCallbackUrl(undefined, 'en')).toBe('/en/dashboard')
  })

  it('keeps a same-site relative path', () => {
    expect(resolveCallbackUrl('/fr/documents?page=2', 'fr')).toBe(
      '/fr/documents?page=2',
    )
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'dashboard',
    '',
  ])('rejects %p', (value) => {
    expect(resolveCallbackUrl(value, 'fr')).toBe('/fr/dashboard')
  })

  it('rejects a repeated parameter', () => {
    expect(resolveCallbackUrl(['/a', '/b'], 'fr')).toBe('/fr/dashboard')
  })
})
