/**The configuration metadata file for controlled vocabularies handled in the application
 * key : vocabulary acronym
 * value:
 *  iriPatterns: array of vocabulary iri pattern. Should include a named group identifier.
 *  icon : icon path
 *  name : Full vocabulary name
 *  org : organization name maintained the vocabulary
 *  url : url of the vocabulary
 * Currently supported : AAT, ABES, ACM, IDREF, JEL, WIKIDATA **/
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
  ['ABES']: {
    iriPatterns: [
      RegExp(
        '^http://hub\\.abes\\.fr(?:/(?!subject)[^/]*)*(?:/subject/(?<identifier>[^/]+))?(?:/[^/]*)*$',
      ),
    ],
    icon: '/icons/abes-vocab.png',
    name: 'Scienceplus',
    org: "ABES : Agence bibliographique de l'enseignement supérieur",
    url: 'http://hub.abes.fr',
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
  ['IDREF']: {
    iriPatterns: [
      RegExp('^http://www\\.idref\\.fr(?:/(?<identifier>[A-Z0-9]+))?(?:/.*)*$'),
    ],
    icon: '/icons/idref-vocab.png',
    name: "IdRef : Identifiants et référentiels pour l'enseignement supérieur et la recherche",
    org: "ABES : Agence bibliographique de l'enseignement supérieur",
    url: 'http://www.idref.fr',
  },
  ['JEL']: {
    iriPatterns: [
      RegExp(
        '^http://zbw\\.eu(?:/(?!jel#)[^/]*)*(?:/jel#(?<identifier>[^/]+))?(?:/[^/]*)*',
      ),
    ],
    icon: '/icons/jel-vocab.png', //or '@/public/icons/jel-vocab-old.svg'
    name: 'Journal of Economic Literature',
    org: 'American Economic Association',
    url: 'https://www.aeaweb.org/jel/guide/jel.php',
  },
  ['WIKIDATA']: {
    iriPatterns: [
      RegExp(
        '^http://www\\.wikidata\\.org/entity(?:/(?<identifier>[A-Z0-9]+))?(?:/.*)*$',
      ),
    ],
    icon: '/icons/wikidata-vocab.png',
    name: 'Wikidata',
    org: 'Wikimedia Foundation',
    url: 'http://www.wikidata.org',
  },
}
