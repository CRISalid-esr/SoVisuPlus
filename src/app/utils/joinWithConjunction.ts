/**
 * Join items as a natural-language list: "A, B and C".
 * The conjunction is passed already translated by the caller.
 */
export const joinWithConjunction = (
  items: string[],
  conjunction: string,
): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`
