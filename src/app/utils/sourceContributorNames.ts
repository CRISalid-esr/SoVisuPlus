import { SourceContribution } from '@/types/SourceContribution'

/**
 * Display names of a source record's contributions, following the same rules as the
 * document Contributors column: every role is listed, source order is preserved, and
 * contributions with no usable name are dropped rather than rendered as blanks.
 */
export const sourceContributorNames = (
  contributions: SourceContribution[],
): string[] =>
  contributions.map(({ person }) => person.name?.trim() ?? '').filter(Boolean)
