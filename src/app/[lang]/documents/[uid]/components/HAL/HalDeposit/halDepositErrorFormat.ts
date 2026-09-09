/**
 * Parses the `lastError` string stored on a failed HAL deposit for display.
 *
 * For a HAL SWORD rejection the string is `"<summary>\n<verboseDescription>"`, where the verbose
 * description is a JSON object mapping an error reason (e.g. `duplicate-entry`) to a message. That
 * message is usually an HTML string, but a value may itself be a nested object — treated like the
 * top-level object, recursively, so the UI can render it as a sub-bullet list. We split off the
 * summary, JSON-parse the rest, and expose the reasons as a tree of nodes. Any other error string
 * (network failure, `HAL responded 500: …`) has no parseable JSON, so `reasons` is `null` and the
 * caller falls back to the raw text.
 */

/** A single reason: either an HTML-message leaf, or a branch whose value is a nested object. */
export type HalDepositErrorNode =
  | {
      key: string
      /** HTML fragment from HAL — must be sanitised before rendering. */
      valueHtml: string
    }
  | {
      key: string
      /** Nested object: rendered as a sub-bullet list, recursively. */
      children: HalDepositErrorNode[]
    }

export interface ParsedHalDepositError {
  summary: string | null
  reasons: HalDepositErrorNode[] | null
}

/** A non-null, non-array object — the only value kind treated as a nested branch. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Converts a verbose-description object into reason nodes. A value that is itself a plain object
 * becomes a branch (recursed into); every other value (string, number, boolean, null, array) is a
 * leaf whose HTML is the `String()` coercion — arrays and primitives keep their textual form.
 */
const toNodes = (obj: Record<string, unknown>): HalDepositErrorNode[] =>
  Object.entries(obj).map(([key, value]) =>
    isPlainObject(value)
      ? { key, children: toNodes(value) }
      : { key, valueHtml: String(value) },
  )

export function parseHalDepositError(lastError: string): ParsedHalDepositError {
  const newline = lastError.indexOf('\n')
  const summary = newline >= 0 ? lastError.slice(0, newline).trim() : null
  const rest = (newline >= 0 ? lastError.slice(newline + 1) : lastError).trim()

  let reasons: HalDepositErrorNode[] | null = null
  try {
    const parsed = JSON.parse(rest) as unknown
    if (isPlainObject(parsed) && Object.keys(parsed).length > 0) {
      reasons = toNodes(parsed)
    }
  } catch {
    // Not a JSON verbose description — leave reasons null; the caller shows the raw string.
  }

  return { summary, reasons }
}
