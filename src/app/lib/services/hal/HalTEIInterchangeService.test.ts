// file: src/app/lib/services/hal/HalTEIInterchangeService.test.ts
import fs from 'node:fs'
import path from 'node:path'

import { HalTEIInterchangeService } from '@/lib/services/hal/HalTEIInterchangeService'
import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Journal } from '@/types/Journal'
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

      const out = service.toHalTEI(doc)

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
        [DocumentType.Presentation, 'PRESCONF'],
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
  })
})
