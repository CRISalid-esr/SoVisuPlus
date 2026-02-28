import { ConceptFilterService } from './ConceptFilterService'

describe('ConceptFilterService (unit with injected list)', () => {
  const service = ConceptFilterService.exclusionList([
    '# a comment',
    '', // empty line
    'https://exact.example/blocked',
    '  https://spaced.example/exact  ', // trims to exact
    'https://prefix.example/path/*', // prefix
    '# another comment',
    'https://anotherprefix.example/*', // prefix
  ]).build()

  test('matchesRegexPattern: true/false and null safety', () => {
    expect(
      service.matchesRegexPattern(
        'https://www.wikidata.org/entity/Q42',
        /wikidata\.org/,
      ),
    ).toBe(true)
    expect(
      service.matchesRegexPattern('https://example.org/Q42', /wikidata\.org/),
    ).toBe(false)
    expect(service.matchesRegexPattern(null, /a/)).toBe(false)
    expect(service.matchesRegexPattern(undefined, /a/)).toBe(false)
  })

  test('matchesLabelList: exact matches are excluded', async () => {
    await expect(
      service.matchesLabelList('https://exact.example/blocked'),
    ).resolves.toBe(true)
    await expect(
      service.matchesLabelList('https://spaced.example/exact'),
    ).resolves.toBe(true)
  })

  test('matchesLabelList: prefix rules are honored', async () => {
    await expect(
      service.matchesLabelList('https://prefix.example/path/child'),
    ).resolves.toBe(true)
    await expect(
      service.matchesLabelList('https://anotherprefix.example/x'),
    ).resolves.toBe(true)
    await expect(
      service.matchesLabelList('https://prefix.example/other/child'),
    ).resolves.toBe(false)
  })

  test('matchesLabelList: non-listed URIs allowed', async () => {
    await expect(
      service.matchesLabelList('https://unlisted.example/foo'),
    ).resolves.toBe(false)
  })

  test('matchesLabelList: null/undefined → false', async () => {
    await expect(service.matchesLabelList(null)).resolves.toBe(false)
    await expect(service.matchesLabelList(undefined)).resolves.toBe(false)
  })
})
