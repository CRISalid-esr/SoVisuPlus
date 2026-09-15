import {
  MAX_DOCUMENT_SEARCH_QUERY_LENGTH,
  MAX_NAME_SEARCH_QUERY_LENGTH,
} from '@/utils/fuzzySearch/constants'

/**
 * Error message for API routes when one of the given search strings is
 * longer than `maxLength`, null otherwise. Non-string values are ignored.
 */
export const searchQueryLengthError = (
  searches: unknown[],
  maxLength: number,
): string | null =>
  searches.some(
    (search) => typeof search === 'string' && search.length > maxLength,
  )
    ? `Search too long: at most ${maxLength} characters`
    : null

/** Column filters of the documents list that may hold a whole pasted title. */
const LONG_DOCUMENT_FILTER_IDS = ['titles']

/**
 * searchQueryLengthError for a documents list request: the global search
 * term and title filter may be MAX_DOCUMENT_SEARCH_QUERY_LENGTH long, the
 * other text filters (contributors, journal) MAX_NAME_SEARCH_QUERY_LENGTH.
 */
export const documentSearchQueryLengthError = (
  searchTerm: string,
  columnFilters: unknown,
): string | null => {
  const filters = (Array.isArray(columnFilters) ? columnFilters : []).map(
    (filter) => (filter ?? {}) as { id?: unknown; value?: unknown },
  )
  const isLong = (filter: { id?: unknown }) =>
    LONG_DOCUMENT_FILTER_IDS.includes(String(filter.id))
  return (
    searchQueryLengthError(
      [searchTerm, ...filters.filter(isLong).map((filter) => filter.value)],
      MAX_DOCUMENT_SEARCH_QUERY_LENGTH,
    ) ??
    searchQueryLengthError(
      filters.filter((filter) => !isLong(filter)).map((filter) => filter.value),
      MAX_NAME_SEARCH_QUERY_LENGTH,
    )
  )
}

/**
 * MUI TextField props limiting a search field to `maxLength` characters, so
 * the user never gets the API's 400. `autoComplete: 'off'` is kept because
 * `slotProps.htmlInput` replaces Material React Table's default input props.
 */
export const searchFieldProps = (maxLength: number) => ({
  slotProps: {
    htmlInput: { autoComplete: 'off', maxLength },
  },
})
