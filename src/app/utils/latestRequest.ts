/**
 * Keeps only the latest of successive requests alive: each call aborts the
 * previous request's controller and returns a fresh one. Pass its `signal` to
 * `fetch`, then ignore the outcome of a request whose signal is aborted, so a
 * slow response to an older search can never overwrite newer results.
 */
export const createLatestRequest = () => {
  let controller: AbortController | null = null
  return (): AbortController => {
    controller?.abort()
    controller = new AbortController()
    return controller
  }
}

/** A `fetch` (or body read) rejected because its request was aborted. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error
    ? error.name === 'AbortError'
    : (error as { name?: unknown } | null)?.name === 'AbortError'
