import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'

type AuthorNameFields = Pick<
  AureHalAuthorDoc,
  'firstName_s' | 'middleName_s' | 'lastName_s' | 'fullName_s' | 'label_s'
>

/**
 * Initials shown on a suggestion card's avatar. Built from first/middle/last name
 * when any are present (one letter each); otherwise from `fullName_s` (or
 * `label_s`) by taking the first letter of its first two words.
 */
export function authorInitials(doc: AuthorNameFields): string {
  const nameParts = [doc.firstName_s, doc.middleName_s, doc.lastName_s].filter(
    (part): part is string => Boolean(part && part.trim()),
  )
  if (nameParts.length > 0) {
    return nameParts
      .map((part) => part.trim()[0])
      .join('')
      .slice(0, 3)
      .toUpperCase()
  }

  const fallback = (doc.fullName_s || doc.label_s || '').trim()
  if (!fallback) return '?'
  return fallback
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
