/** Common shape of every search query sent to the API. */
export interface SearchQuery {
  searchTerm: string
}

/** A `SearchQuery` that returns a paginated list of results. */
export interface BaseQuery extends SearchQuery {
  page: number
}
