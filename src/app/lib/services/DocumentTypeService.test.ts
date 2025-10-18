import { DocumentType } from '@prisma/client'
import { DOCUMENT_TYPES } from '@/lib/services/DocumentTypes'
import { DocumentTypeService } from '@/lib/services/DocumentTypeService'

describe('DocumentTypeService / DocumentTypes', () => {
  it('DOCUMENT_TYPES has expected top-level structure', () => {
    expect(DOCUMENT_TYPES[DocumentType.Document]).toEqual(
      expect.arrayContaining([DocumentType.ScholarlyPublication]),
    )

    expect(DOCUMENT_TYPES[DocumentType.ScholarlyPublication]).toEqual(
      expect.arrayContaining([
        DocumentType.Article,
        DocumentType.Book,
        DocumentType.Presentation,
      ]),
    )

    expect(DOCUMENT_TYPES[DocumentType.Book]).toEqual(
      expect.arrayContaining([
        DocumentType.Monograph,
        DocumentType.Proceedings,
        DocumentType.BookOfChapters,
      ]),
    )
  })

  it('childrenOf returns immediate children', () => {
    expect(DocumentTypeService.childrenOf(DocumentType.Article)).toEqual(
      expect.arrayContaining([
        DocumentType.JournalArticle,
        DocumentType.ConferenceArticle,
        DocumentType.ConferenceAbstract,
        DocumentType.Preface,
        DocumentType.Comment,
        DocumentType.BookChapter,
      ]),
    )

    expect(DocumentTypeService.childrenOf(DocumentType.Presentation)).toEqual(
      [],
    )
  })

  it('descendantsOf returns deep descendants (and optionally self)', () => {
    const desc = new Set(
      DocumentTypeService.descendantsOf(DocumentType.ScholarlyPublication),
    )

    // intermediates
    expect(desc.has(DocumentType.Article)).toBe(true)
    expect(desc.has(DocumentType.Book)).toBe(true)
    expect(desc.has(DocumentType.Presentation)).toBe(true)

    // article leaves
    ;[
      DocumentType.JournalArticle,
      DocumentType.ConferenceArticle,
      DocumentType.ConferenceAbstract,
      DocumentType.Preface,
      DocumentType.Comment,
      DocumentType.BookChapter,
    ].forEach((t) => expect(desc.has(t)).toBe(true))

    // book leaves
    ;[
      DocumentType.Monograph,
      DocumentType.Proceedings,
      DocumentType.BookOfChapters,
    ].forEach((t) => expect(desc.has(t)).toBe(true))

    // does not include self by default
    expect(desc.has(DocumentType.ScholarlyPublication)).toBe(false)

    // includeSelf option
    const withSelf = DocumentTypeService.descendantsOf(
      DocumentType.ScholarlyPublication,
      { includeSelf: true },
    )
    expect(withSelf[0]).toBe(DocumentType.ScholarlyPublication)
  })

  it('ancestorsOf returns chain to root (and supports options)', () => {
    // e.g. BookChapter -> Article -> ScholarlyPublication -> Document
    const chain = DocumentTypeService.ancestorsOf(DocumentType.BookChapter, {
      includeSelf: true,
      rootFirst: true,
    })

    // start at root
    expect(chain[0]).toBe(DocumentType.Document)
    // ensure expected nodes are present in order
    expect(chain).toEqual(
      expect.arrayContaining([
        DocumentType.Document,
        DocumentType.ScholarlyPublication,
        DocumentType.Article,
        DocumentType.BookChapter, // includeSelf: true
      ]),
    )

    // parent-first order
    const parentFirst = DocumentTypeService.ancestorsOf(
      DocumentType.Monograph,
      { includeSelf: false, rootFirst: false },
    )
    // should start with parent "Book"
    expect(parentFirst[0]).toBe(DocumentType.Book)
    // and include the chain upwards
    expect(parentFirst).toEqual(
      expect.arrayContaining([
        DocumentType.Book,
        DocumentType.ScholarlyPublication,
        DocumentType.Document,
      ]),
    )
  })

  it('isA works for exact type and descendants', () => {
    expect(
      DocumentTypeService.isA(
        DocumentType.JournalArticle,
        DocumentType.ScholarlyPublication,
      ),
    ).toBe(true)

    expect(
      DocumentTypeService.isA(
        DocumentType.Monograph,
        DocumentType.ScholarlyPublication,
      ),
    ).toBe(true)

    expect(DocumentTypeService.isA(DocumentType.Book, DocumentType.Book)).toBe(
      true,
    )

    // negative
    expect(
      DocumentTypeService.isA(DocumentType.JournalArticle, DocumentType.Book),
    ).toBe(false)
  })

  it('isDocumentType type-guard accepts real enum values and rejects others', () => {
    expect(
      DocumentTypeService.isDocumentType(DocumentType.JournalArticle),
    ).toBe(true)
    expect(DocumentTypeService.isDocumentType('NotAType')).toBe(false)
    expect(DocumentTypeService.isDocumentType(42)).toBe(false)
    expect(DocumentTypeService.isDocumentType(null)).toBe(false)
  })

  it('expandTypes adds descendants and keeps unique values', () => {
    const expanded = DocumentTypeService.expandTypes([
      DocumentType.ScholarlyPublication,
    ])

    const expected = [
      // self
      DocumentType.ScholarlyPublication,
      // intermediates
      DocumentType.Article,
      DocumentType.Book,
      DocumentType.Presentation,
      // article leaves
      DocumentType.JournalArticle,
      DocumentType.ConferenceArticle,
      DocumentType.ConferenceAbstract,
      DocumentType.Preface,
      DocumentType.Comment,
      DocumentType.BookChapter,
      // book leaves
      DocumentType.Monograph,
      DocumentType.Proceedings,
      DocumentType.BookOfChapters,
    ]

    expect(expanded).toEqual(expect.arrayContaining(expected))
    expect(new Set(expanded).size).toBe(expanded.length) // uniqueness
  })

  it('toMenuTree builds a nested tree with default labels', () => {
    const root = DocumentTypeService.toMenuTree() // starts at Document

    expect(root.value).toBe(DocumentType.Document)
    expect(root.children?.length).toBeGreaterThan(0)

    const sp = root.children?.find(
      (n) => n.value === DocumentType.ScholarlyPublication,
    )
    expect(sp).toBeTruthy()
    expect(sp?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: DocumentType.Article }),
        expect.objectContaining({ value: DocumentType.Book }),
        expect.objectContaining({ value: DocumentType.Presentation }),
      ]),
    )

    // label formatting "JournalArticle" -> "Journal Article"
    const articleNode = sp?.children?.find(
      (n) => n.value === DocumentType.Article,
    )
    const ja = articleNode?.children?.find(
      (n) => n.value === DocumentType.JournalArticle,
    )
    expect(ja?.label).toBe('Journal Article')
  })
})
