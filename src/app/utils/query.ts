import { BaseQuery } from '@/types/BaseQuery'

/**
 * Converts a QueryObject into a URL query string.
 * @param queryObject - The object containing query parameters.
 * @returns A URL-encoded query string.
 */
export const toQueryString = <T extends BaseQuery>(queryObject: T): string => {
  return new URLSearchParams(
    Object.entries(queryObject).reduce(
      (acc, [key, value]) => {
        acc[key] = value ? value.toString() : ''
        return acc
      },
      {} as Record<string, string>,
    ),
  ).toString()
}
