export const VOCABS: Record<
  string,
  { iriPatterns: [RegExp]; icon: string; name: string }
> = {
  ['AAT']: {
    iriPatterns: [
      RegExp(
        '^http://vocab\\.getty\\.edu/aat(?:/(?<identifier>[0-9]+))?(?:/.*)*$',
      ),
    ],
    icon: '/icons/aat-vocab.gif',
    name: 'Art & Architecture Thesaurus',
  },
  ['JEL']: {
    iriPatterns: [
      RegExp(
        '^http://zbw.eu/beta/external_identifiers(?:/(?!jel#).*)*(?:/jel#(?<identifier>[A-Z0-9]+))?(?:/.*)*$',
      ),
    ],
    icon: '/icons/jel-vocab-old.svg',
    name: 'Journal of Economic Literature',
  },
  ['ACM']: {
    iriPatterns: [
      RegExp('^https://dl\\.acm\\.org(?:/(?<identifier>[0-9.]+))?(?:/.*)*$'),
    ],
    icon: '/icons/acm-vocab.svg',
    name: 'Association for Computing Machinery',
  },
}
