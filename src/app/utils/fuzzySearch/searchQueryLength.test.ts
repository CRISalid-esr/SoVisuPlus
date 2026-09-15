import {
  documentSearchQueryLengthError,
  searchFieldProps,
  searchQueryLengthError,
} from './searchQueryLength'

describe('searchQueryLengthError', () => {
  it('accepts searches up to the limit and ignores non-strings', () => {
    expect(searchQueryLengthError(['abc', null, ['a'.repeat(9)]], 3)).toBeNull()
  })

  it('reports a search over the limit', () => {
    expect(searchQueryLengthError(['ok', 'abcd'], 3)).toBe(
      'Search too long: at most 3 characters',
    )
  })
})

describe('documentSearchQueryLengthError', () => {
  it('allows 500 characters for the search term and title filter', () => {
    expect(
      documentSearchQueryLengthError('a'.repeat(500), [
        { id: 'titles', value: 'b'.repeat(500) },
      ]),
    ).toBeNull()
    expect(documentSearchQueryLengthError('a'.repeat(501), [])).toBe(
      'Search too long: at most 500 characters',
    )
    expect(
      documentSearchQueryLengthError('', [
        { id: 'titles', value: 'a'.repeat(501) },
      ]),
    ).not.toBeNull()
  })

  it('allows 200 characters for the contributors and journal filters', () => {
    expect(
      documentSearchQueryLengthError('', [
        { id: 'type', value: ['Book'] },
        { id: 'contributions', value: 'a'.repeat(200) },
        { id: 'publishedIn', value: 'a'.repeat(200) },
      ]),
    ).toBeNull()
    expect(
      documentSearchQueryLengthError('', [
        { id: 'contributions', value: 'a'.repeat(201) },
      ]),
    ).toBe('Search too long: at most 200 characters')
    expect(
      documentSearchQueryLengthError('', [
        { id: 'publishedIn', value: 'a'.repeat(201) },
      ]),
    ).not.toBeNull()
  })

  it('tolerates malformed column filters', () => {
    expect(documentSearchQueryLengthError('', 'not an array')).toBeNull()
    expect(documentSearchQueryLengthError('', [null, 3])).toBeNull()
  })
})

describe('searchFieldProps', () => {
  it('limits the input length and keeps autocomplete off', () => {
    expect(searchFieldProps(200)).toEqual({
      slotProps: { htmlInput: { autoComplete: 'off', maxLength: 200 } },
    })
  })
})
