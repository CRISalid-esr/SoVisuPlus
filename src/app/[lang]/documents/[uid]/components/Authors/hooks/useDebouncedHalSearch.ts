import { useEffect, useState } from 'react'

const DEBOUNCE_MS = 350
const MIN_CHARS = 2

export type HalSearchState<T> = {
  input: string
  setInput: (value: string) => void
  loading: boolean
  /** true once a search has run and returned no results. */
  empty: boolean
  error: boolean
  results: T[]
}

/**
 * Debounced (350ms) search against a HAL backend-proxy route, requiring at least
 * 2 characters. Aborts in-flight requests when the input changes or the component
 * unmounts. The proxy already enforces the 15s timeout; a failed/aborted request
 * surfaces as `error`.
 */
export function useDebouncedHalSearch<T>(
  endpoint:
    | '/api/hal/authors'
    | '/api/hal/structures'
    | '/api/hal/institutions',
): HalSearchState<T> {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [error, setError] = useState(false)
  const [results, setResults] = useState<T[]>([])

  useEffect(() => {
    const query = input.trim()
    if (query.length < MIN_CHARS) {
      setLoading(false)
      setError(false)
      setEmpty(false)
      setResults([])
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)
    setEmpty(false)

    const handler = setTimeout(async () => {
      try {
        const response = await fetch(
          `${endpoint}?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        )
        if (!response.ok)
          throw new Error(`HAL search failed: ${response.status}`)
        const data = (await response.json()) as { docs?: T[] }
        const docs = data.docs ?? []
        setResults(docs)
        setEmpty(docs.length === 0)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setResults([])
        setError(true)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [input, endpoint])

  return { input, setInput, loading, empty, error, results }
}
