// file: src/app/lib/services/hal/HalTEIInterchangeService.test.ts
import fs from 'node:fs'
import path from 'node:path'

import { HalTEIInterchangeService } from '@/lib/services/hal/HalTEIInterchangeService'
import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Concept } from '@/types/Concept'
import { Journal } from '@/types/Journal'
import { Contribution } from '@/types/Contribution'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'
import { Person } from '@/types/Person'
import { DocumentState } from '@prisma/client'

const readFixture = (name: string): string => {
  const p = path.join(__dirname, '__fixtures__', name)
  return fs.readFileSync(p, 'utf-8')
}

const makeDoc = (type: DocumentType): DocumentClass =>
  new DocumentClass(
    'doc-1',
    type,
    null,
    null,
    null,
    null,
    null,
    [new Literal('Hello', 'en')],
    [],
    [],
    [],
    [],
    DocumentState.default,
  )

describe('HalTEIInterchangeService', () => {
  const service = new HalTEIInterchangeService()

  describe('fromHalTEI()', () => {
    it('parses halTypology ART as DocumentType.Article', () => {
      const xml = readFixture('art.xml')
      const doc = service.fromHalTEI(xml)
      expect(doc.documentType).toBe(DocumentType.Article)
    })

    it('extracts english title from titleStmt', () => {
      const xml = readFixture('art.xml')
      const doc = service.fromHalTEI(xml)

      const en = doc.titles.find((t) => t.language === 'en')?.value
      expect(en).toBe('Do we really understand quantum mechanics?')
    })

    it('extracts english abstract', () => {
      const xml = readFixture('art.xml')
      const doc = service.fromHalTEI(xml)

      const enAbs = doc.abstracts.find((a) => a.language === 'en')?.value
      expect(enAbs).toContain('This article presents a general discussion')
    })

    it('extracts publication year as publicationDate', () => {
      const xml = readFixture('art.xml')
      const doc = service.fromHalTEI(xml)
      expect(doc.publicationDate).toBe('2001')
    })

    it('extracts volume and pages from imprint', () => {
      const xml = readFixture('art.xml')
      const doc = service.fromHalTEI(xml)
      expect(doc.volume).toBe('69')
      expect(doc.pages).toBe('655 - 701')
    })

    describe('type mapping (HAL -> Prisma)', () => {
      const mkXml = (
        halTypology: string,
      ) => `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <listBibl>
        <biblFull>
          <profileDesc>
            <textClass>
              <classCode scheme="halTypology" n="${halTypology}"/>
            </textClass>
          </profileDesc>
        </biblFull>
      </listBibl>
    </body>
  </text>
</TEI>`

      it.each([
        ['ART', DocumentType.Article],
        ['COMM', DocumentType.ConferenceArticle],
        ['PROCEEDINGS', DocumentType.Proceedings],
        ['OUV', DocumentType.Book],
        ['COUV', DocumentType.BookChapter],
        ['THESE', DocumentType.ScholarlyPublication],
        ['REPORT', DocumentType.ScholarlyPublication],
        ['POSTER', DocumentType.Presentation],
        ['PRESCONF', DocumentType.Presentation],
        ['NOTE', DocumentType.Comment],
        ['BLOG', DocumentType.Comment],
        ['UNDEFINED', DocumentType.Document],
        ['SOMETHING_UNKNOWN', DocumentType.Document],
      ])('maps %s to %s', (halTypology, expected) => {
        const doc = service.fromHalTEI(mkXml(halTypology))
        expect(doc.documentType).toBe(expected)
      })

      it('defaults to DocumentType.Document when halTypology is missing', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><listBibl><biblFull/></listBibl></body></text>
</TEI>`
        const doc = service.fromHalTEI(xml)
        expect(doc.documentType).toBe(DocumentType.Document)
      })
    })
  })

  describe('fromHalTEI() with submit.xml', () => {
    it('parses halTypology UNDEFINED as DocumentType.Document', () => {
      const xml = readFixture('submit.xml')
      const doc = service.fromHalTEI(xml)
      expect(doc.documentType).toBe(DocumentType.Document)
    })

    it('extracts english title and abstract', () => {
      const xml = readFixture('submit.xml')
      const doc = service.fromHalTEI(xml)

      expect(doc.titles.find((t) => t.language === 'en')?.value).toBe(
        'Absence of absolutely continuous spectrum for random scattering zippers',
      )
      expect(doc.abstracts.find((a) => a.language === 'en')?.value).toContain(
        'A scattering zipper is a system',
      )
    })

    it('does not crash when journal is missing (submit.xml has no monogr/title[@level=j])', () => {
      const xml = readFixture('submit.xml')
      const doc = service.fromHalTEI(xml)
      expect(doc.journal).toBeUndefined()
    })
  })

  describe('toHalTEI()', () => {
    it('writes titleStmt titles + profileDesc abstracts + langUsage language', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.titles = [
        new Literal('Do we really understand quantum mechanics?', 'en'),
        new Literal('Comprenons-nous vraiment la mécanique quantique ?', 'fr'),
      ]
      doc.abstracts = [
        new Literal('This article presents a general discussion...', 'en'),
      ]

      const out = service.toHalTEI(doc, { language: 'en' })

      // titles
      expect(out).toContain(
        '<title xml:lang="en">Do we really understand quantum mechanics?</title>',
      )
      expect(out).toContain(
        '<title xml:lang="fr">Comprenons-nous vraiment la mécanique quantique ?</title>',
      )

      // abstracts
      expect(out).toContain(
        '<abstract xml:lang="en">This article presents a general discussion...</abstract>',
      )

      // language
      expect(out).toContain('<language ident="en"/>')

      // doctype
      expect(out).toContain('scheme="halTypology"')
      expect(out).toContain('n="ART"')
    })

    it('emits fr+en subject keywords for a THESE (other languages dropped)', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.subjects = [
        new Concept('c-1', [
          new Literal('mécanique quantique', 'fr'),
          new Literal('quantum mechanics', 'en'),
          new Literal('Quantenmechanik', 'de'),
        ]),
      ]

      const out = service.toHalTEI(doc, { halDocumentType: 'THESE' })

      expect(out).toContain('<keywords scheme="author">')
      expect(out).toContain('<term xml:lang="fr">mécanique quantique</term>')
      expect(out).toContain('<term xml:lang="en">quantum mechanics</term>')
      expect(out).not.toContain('Quantenmechanik')
    })

    it('emits one term per subject for non-thesis types (fr preferred, en fallback)', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.subjects = [
        new Concept('c-fr', [
          new Literal('physique', 'fr'),
          new Literal('physics', 'en'),
        ]),
        new Concept('c-en', [new Literal('astronomy', 'en')]),
      ]

      const out = service.toHalTEI(doc)

      // French subject → French term only (English preferred label dropped).
      expect(out).toContain('<term xml:lang="fr">physique</term>')
      expect(out).not.toContain('physics')
      // English-only subject → English term as fallback.
      expect(out).toContain('<term xml:lang="en">astronomy</term>')
    })

    it('emits no keywords element when the document has no subjects', () => {
      const out = service.toHalTEI(makeDoc(DocumentType.Article))
      expect(out).not.toContain('<keywords')
    })

    it('writes monogr journal title + imprint volume/issue/pages/datePub when journal is provided', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.journal = new Journal(
        'Foundations of Physics',
        '1234-5678',
        'Springer',
        [],
      )
      doc.volume = '69'
      doc.issue = '2'
      doc.pages = '655 - 701'
      doc.publicationDate = '2001'

      const out = service.toHalTEI(doc)

      expect(out).toContain('<title level="j">Foundations of Physics</title>')
      expect(out).toContain('<biblScope unit="volume">69</biblScope>')
      expect(out).toContain('<biblScope unit="issue">2</biblScope>')
      expect(out).toContain('<biblScope unit="pp">655 - 701</biblScope>')
      expect(out).toContain('<date type="datePub">2001</date>')
    })

    it('writes authors with affiliation refs and org structures', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'

      const person = new Person(
        'p-1',
        false,
        null,
        'Marie Curie',
        'Marie',
        'Curie',
      )
      const org = new AuthorityOrganization(
        'org-uid-1',
        ['LPTHE'],
        null,
        [],
        [
          new AuthorityOrganizationIdentifier(
            'ror' as never,
            'https://ror.org/example',
          ),
        ],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]

      const out = service.toHalTEI(doc)

      expect(out).toContain('<forename type="first">Marie</forename>')
      expect(out).toContain('<surname>Curie</surname>')
      expect(out).toContain('ref="#localStruct-1"')
      expect(out).toContain('xml:id="localStruct-1"')
      expect(out).toContain('<orgName>LPTHE</orgName>')
      expect(out).toContain('<idno type="ROR">https://ror.org/example</idno>')
      expect(out).toContain('type="institution"')
    })

    it('sets org type to laboratory and keeps only RNSR when org has RNSR', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person(
        'p-1',
        false,
        null,
        'Marie Curie',
        'Marie',
        'Curie',
      )
      const org = new AuthorityOrganization(
        'org-1',
        ['LPTHE'],
        null,
        [],
        [new AuthorityOrganizationIdentifier('nns' as never, '200012345A')],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).toContain('type="laboratory"')
      expect(out).toContain('<idno type="RNSR">200012345A</idno>')
    })

    it('drops ROR and uses RNSR when org has both', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person(
        'p-1',
        false,
        null,
        'Marie Curie',
        'Marie',
        'Curie',
      )
      const org = new AuthorityOrganization(
        'org-1',
        ['LPTHE'],
        null,
        [],
        [
          new AuthorityOrganizationIdentifier('nns' as never, '200012345A'),
          new AuthorityOrganizationIdentifier(
            'ror' as never,
            'https://ror.org/example',
          ),
        ],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).toContain('type="laboratory"')
      expect(out).toContain('<idno type="RNSR">200012345A</idno>')
      expect(out).not.toContain('<idno type="ROR">')
    })

    it('emits idhal idno and institution type when org has a HAL identifier', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person(
        'p-1',
        false,
        null,
        'Marie Curie',
        'Marie',
        'Curie',
      )
      const org = new AuthorityOrganization(
        'org-hal',
        ['LPTHE'],
        null,
        [],
        [new AuthorityOrganizationIdentifier('hal' as never, '1234')],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).toContain('type="institution"')
      expect(out).toContain('<idno type="idhal">1234</idno>')
    })

    it('keeps only RNSR and drops HAL idno when org has both', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person(
        'p-1',
        false,
        null,
        'Marie Curie',
        'Marie',
        'Curie',
      )
      const org = new AuthorityOrganization(
        'org-rnsr-hal',
        ['LPTHE'],
        null,
        [],
        [
          new AuthorityOrganizationIdentifier('nns' as never, '200012345A'),
          new AuthorityOrganizationIdentifier('hal' as never, '1234'),
        ],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).toContain('type="laboratory"')
      expect(out).toContain('<idno type="RNSR">200012345A</idno>')
      expect(out).not.toContain('<idno type="idhal">')
    })

    it('omits affiliation when org has no HAL-recognized identifiers', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person('p-1', false, null, 'John Doe', 'John', 'Doe')
      const org = new AuthorityOrganization(
        'org-no-id',
        ['University of Ferrara'],
        null,
        [],
        [new AuthorityOrganizationIdentifier('scopus' as never, '12345')],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).not.toContain('ref="#localStruct-')
      expect(out).not.toContain('<listOrg')
      expect(out).toContain('<surname>Doe</surname>')
    })

    it('omits affiliation when org has empty identifiers', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person('p-1', false, null, 'John Doe', 'John', 'Doe')
      const org = new AuthorityOrganization(
        'org-empty',
        ['Some Lab'],
        null,
        [],
        [],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).not.toContain('ref="#localStruct-')
      expect(out).not.toContain('<listOrg')
    })

    it('omits affiliation when org has HAL-recognized identifier type but empty value', () => {
      const doc = makeDoc(DocumentType.Article)
      doc.publicationDate = '2001'
      const person = new Person('p-1', false, null, 'John Doe', 'John', 'Doe')
      const org = new AuthorityOrganization(
        'org-empty-val',
        ['Some Lab'],
        null,
        [],
        [new AuthorityOrganizationIdentifier('ror' as never, '')],
      )
      doc.contributions = [new Contribution(person, [], [org], 1)]
      const out = service.toHalTEI(doc)
      expect(out).not.toContain('ref="#localStruct-')
      expect(out).not.toContain('<listOrg')
    })

    it('halDocumentType option overrides auto-mapped typology', () => {
      const doc = makeDoc(DocumentType.Article) // auto-maps to 'ART'
      const out = service.toHalTEI(doc, { halDocumentType: 'THESE' })
      expect(out).toContain('n="THESE"')
      expect(out).not.toContain('n="ART"')
    })

    it('type mapping (Prisma -> HAL) writes correct halTypology', () => {
      const cases: Array<[DocumentType, string]> = [
        [DocumentType.Article, 'ART'],
        [DocumentType.JournalArticle, 'ART'],
        [DocumentType.ConferenceArticle, 'COMM'],
        [DocumentType.ConferenceAbstract, 'COMM'],
        [DocumentType.Proceedings, 'PROCEEDINGS'],
        [DocumentType.Book, 'OUV'],
        [DocumentType.Monograph, 'OUV'],
        [DocumentType.BookChapter, 'COUV'],
        [DocumentType.BookOfChapters, 'OUV'],
        [DocumentType.Presentation, 'COMM'],
        [DocumentType.Comment, 'NOTE'],
        [DocumentType.Document, 'UNDEFINED'],
        [DocumentType.ScholarlyPublication, 'UNDEFINED'],
      ]

      for (const [docType, expectedHal] of cases) {
        const doc = makeDoc(docType)
        const out = service.toHalTEI(doc)
        expect(out).toContain(`scheme="halTypology"`)
        expect(out).toContain(`n="${expectedHal}"`)
      }
    })

    it('injects the document UID as <idno type="localRef">', () => {
      const out = service.toHalTEI(makeDoc(DocumentType.Article), {
        localRef: 'doc-1',
      })
      expect(out).toContain('type="localRef"')
      expect(out).toContain('doc-1')
    })

    it('emits a <ref> per file with type/subtype/target/n and an embargo date', () => {
      const out = service.toHalTEI(makeDoc(DocumentType.Article), {
        files: [
          {
            fileName: 'doc.pdf',
            fileType: 'file',
            fileSource: 'author',
            notBefore: '2026-12-24',
            n: 1,
          },
          {
            fileName: 'data.csv',
            fileType: 'annex',
            fileSource: 'author',
            n: 2,
          },
        ],
      })
      expect(out).toContain('type="file"')
      expect(out).toContain('subtype="author"')
      expect(out).toContain('target="doc.pdf"')
      expect(out).toContain('n="1"')
      expect(out).toContain('type="annex"')
      expect(out).toContain('target="data.csv"')
      expect(out).toContain('notBefore="2026-12-24"')
    })

    it('emits availability/licence with the resolved @target', () => {
      const out = service.toHalTEI(makeDoc(DocumentType.Article), {
        licenceTarget: 'http://creativecommons.org/licenses/by/4.0/',
      })
      expect(out).toContain('<licence')
      expect(out).toContain(
        'target="http://creativecommons.org/licenses/by/4.0/"',
      )
    })

    it('prunes empty editionStmt/publicationStmt when no deposit options are given', () => {
      const out = service.toHalTEI(makeDoc(DocumentType.Article))
      expect(out).not.toContain('editionStmt')
      expect(out).not.toContain('publicationStmt')
    })

    describe('per-type conditional metadata', () => {
      it('emits the book title as monogr/title[@level="m"] for COUV', () => {
        const doc = makeDoc(DocumentType.BookChapter)
        doc.publicationDate = '2016'
        const out = service.toHalTEI(doc, {
          halDocumentType: 'COUV',
          bookTitle: 'Titre ouvrage',
        })
        expect(out).toContain('<title level="m">Titre ouvrage</title>')
        // the skeleton's empty journal title must not linger
        expect(out).not.toContain('<title level="j"/>')
        expect(out).not.toContain('<title level="j"></title>')
      })

      it('emits monogr/meeting with title, start date (text), settlement and country key', () => {
        const doc = makeDoc(DocumentType.ConferenceArticle)
        doc.publicationDate = '2016'
        const out = service.toHalTEI(doc, {
          halDocumentType: 'COMM',
          conferenceTitle: 'My Conference',
          conferenceStartDate: '2016-01',
          conferenceCity: 'Prague',
          conferenceCountry: 'CZ',
        })
        expect(out).toContain('<meeting>')
        expect(out).toContain('<title>My Conference</title>')
        expect(out).toContain('<date type="start">2016-01</date>')
        expect(out).toContain('<settlement>Prague</settlement>')
        expect(out).toContain('<country key="CZ"/>')
        // meeting child order: title < date < settlement < country
        const m = out.slice(out.indexOf('<meeting>'), out.indexOf('</meeting>'))
        expect(m.indexOf('<title>')).toBeLessThan(m.indexOf('<date'))
        expect(m.indexOf('<date')).toBeLessThan(m.indexOf('<settlement>'))
        expect(m.indexOf('<settlement>')).toBeLessThan(m.indexOf('<country'))
        // meeting sits before imprint in monogr
        expect(out.indexOf('<meeting>')).toBeLessThan(out.indexOf('<imprint>'))
      })

      it('emits monogr/authority[@type="institution"] for REPORT', () => {
        const doc = makeDoc(DocumentType.ScholarlyPublication)
        doc.publicationDate = '2016'
        const out = service.toHalTEI(doc, {
          halDocumentType: 'REPORT',
          institution: 'Some University',
        })
        expect(out).toContain(
          '<authority type="institution">Some University</authority>',
        )
      })

      it('emits institution + supervisor authorities and dateDefended for THESE', () => {
        const doc = makeDoc(DocumentType.ScholarlyPublication)
        doc.publicationDate = '2014-03-26'
        const out = service.toHalTEI(doc, {
          halDocumentType: 'THESE',
          institution: "Université d'appartenance",
          supervisor: 'Superviseur',
        })
        expect(out).toContain(
          '<authority type="institution">Université d\'appartenance</authority>',
        )
        expect(out).toContain(
          '<authority type="supervisor">Superviseur</authority>',
        )
        // institution authority appears before supervisor authority
        expect(out.indexOf('type="institution"')).toBeLessThan(
          out.indexOf('type="supervisor"'),
        )
        // both datePub and dateDefended are emitted for a thesis
        expect(out).toContain('<date type="datePub">2014-03-26</date>')
        expect(out).toContain('<date type="dateDefended">2014-03-26</date>')
        // authority is the last monogr child (after imprint)
        expect(out.indexOf('<imprint>')).toBeLessThan(
          out.indexOf('type="institution"'),
        )
      })

      it('leaves ART output free of meeting/authority/book-title elements', () => {
        const doc = makeDoc(DocumentType.Article)
        doc.journal = new Journal(
          'Foundations of Physics',
          '1234-5678',
          'Springer',
          [],
        )
        doc.publicationDate = '2001'
        const out = service.toHalTEI(doc, { halDocumentType: 'ART' })
        expect(out).not.toContain('<meeting>')
        expect(out).not.toContain('<authority type="supervisor"')
        expect(out).not.toContain('type="dateDefended"')
        expect(out).not.toContain('level="m"')
      })
    })

    it('keeps biblFull child order: editionStmt before publicationStmt before sourceDesc', () => {
      const out = service.toHalTEI(makeDoc(DocumentType.Article), {
        localRef: 'doc-1',
        files: [
          { fileName: 'doc.pdf', fileType: 'file', fileSource: 'author', n: 1 },
        ],
      })
      const edition = out.indexOf('editionStmt')
      const publication = out.indexOf('publicationStmt')
      const source = out.indexOf('sourceDesc')
      expect(edition).toBeGreaterThan(-1)
      expect(publication).toBeGreaterThan(edition)
      expect(source).toBeGreaterThan(publication)
    })
  })
})
