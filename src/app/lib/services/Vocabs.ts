export const VOCABS: Record<
  string,
  {
    iriPatterns: [RegExp]
    icon: string
    name: string
    org: string
    url: string
  }
> = {
  ['AAT']: {
    iriPatterns: [
      RegExp(
        '^http://vocab\\.getty\\.edu/aat(?:/(?<identifier>[0-9]+))?(?:/.*)*$',
      ),
    ],
    icon: '/icons/aat-vocab.gif',
    name: 'Art & Architecture Thesaurus',
    org: 'Getty Research Institute',
    url: 'https://www.getty.edu/research/tools/vocabularies/aat/',
  },
  ['JEL']: {
    iriPatterns: [
      RegExp(
        '^http://zbw.eu/beta/external_identifiers(?:/(?!jel#).*)*(?:/jel#(?<identifier>[A-Z0-9]+))?(?:/.*)*$',
      ),
    ],
    icon: '/icons/jel-vocab-old.svg',
    name: 'Journal of Economic Literature',
    org: 'American Economic Association',
    url: 'https://www.aeaweb.org/jel/guide/jel.php',
  },
  ['ACM']: {
    iriPatterns: [
      RegExp('^https://dl\\.acm\\.org(?:/(?<identifier>[0-9.]+))?(?:/.*)*$'),
    ],
    icon: '/icons/acm-vocab.svg',
    name: 'Computing Classification System',
    org: 'Association for Computing Machinery',
    url: 'https://dl.acm.org/ccs',
  },
}
