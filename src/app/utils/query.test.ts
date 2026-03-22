import { toQueryString } from '@/app/utils/query'
import { BaseQuery } from '@/types/BaseQuery'

interface ResearchUnitsByNameQuery extends BaseQuery {
  searchLang: string
}

describe('toQueryString utility', () => {
  it('should convert BaseQuery to a query string', () => {
    const baseQuery: BaseQuery = {
      searchTerm: 'example',
      page: 1,
    }

    const result = toQueryString(baseQuery)

    expect(result).toBe('searchTerm=example&page=1')
  })

  it('should convert ResearchUnitsByNameQuery to a query string', () => {
    const researchQuery: ResearchUnitsByNameQuery = {
      searchTerm: 'example',
      searchLang: 'en',
      page: 2,
    }

    const result = toQueryString(researchQuery)

    expect(result).toBe('searchTerm=example&searchLang=en&page=2')
  })

  it('should handle empty query objects', () => {
    const emptyQuery = {} as BaseQuery

    const result = toQueryString(emptyQuery)

    expect(result).toBe('')
  })

  it('should handle special characters in query values', () => {
    const specialCharQuery: BaseQuery = {
      searchTerm: 'example with spaces & special#chars',
      page: 1,
    }

    const result = toQueryString(specialCharQuery)

    expect(result).toBe(
      'searchTerm=example+with+spaces+%26+special%23chars&page=1',
    )
  })

  it('should handle numeric values correctly', () => {
    const numericQuery: BaseQuery = {
      searchTerm: 'test',
      page: 42,
    }

    const result = toQueryString(numericQuery)

    expect(result).toBe('searchTerm=test&page=42')
  })

  it('should convert undefined properties to blank strings', () => {
    const partialQuery = {
      searchTerm: 'example',
      page: undefined,
    } as unknown as BaseQuery

    const result = toQueryString(partialQuery)

    expect(result).toBe('searchTerm=example&page=')
  })

  it('should handle boolean and non-stringifiable values gracefully', () => {
    const queryWithBoolean = {
      searchTerm: 'example',
      page: 1,
      isAvailable: true, // Extra property not in BaseQuery
    } as unknown as BaseQuery

    const result = toQueryString(queryWithBoolean)

    expect(result).toBe('searchTerm=example&page=1&isAvailable=true')
  })
})
