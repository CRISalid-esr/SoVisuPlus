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

  it('toMenuTree returns a flattened tree with depth annotations', () => {
    const nodes = DocumentTypeService.toMenuTree()

    // Root node should be Document at depth 0
    const root = nodes.find((n) => n.value === DocumentType.Document)
    expect(root).toBeDefined()
    expect(root?.depth).toBe(0)

    // ScholarlyPublication should exist at depth 1
    const sp = nodes.find((n) => n.value === DocumentType.ScholarlyPublication)
    expect(sp).toBeDefined()
    expect(sp?.depth).toBe(1)

    // Its immediate children (Article, Book, Presentation) should be at depth 2
    const children = nodes.filter((n) =>
      (
        [
          DocumentType.Article,
          DocumentType.Book,
          DocumentType.Presentation,
        ] as DocumentType[]
      ).includes(n.value),
    )
    expect(children).toHaveLength(3)
    children.forEach((c) => expect(c.depth).toBe(2))

    // Deeper descendants should have depth > 2
    const articleLeaves = [
      DocumentType.JournalArticle,
      DocumentType.ConferenceArticle,
      DocumentType.ConferenceAbstract,
      DocumentType.Preface,
      DocumentType.Comment,
      DocumentType.BookChapter,
    ]
    articleLeaves.forEach((t) => {
      const node = nodes.find((n) => n.value === t)
      expect(node).toBeDefined()
      expect(node!.depth).toBeGreaterThan(2)
    })

    // Book branch depths
    const bookNode = nodes.find((n) => n.value === DocumentType.Book)
    expect(bookNode?.depth).toBe(2)
    ;[
      DocumentType.Monograph,
      DocumentType.Proceedings,
      DocumentType.BookOfChapters,
    ].forEach((t) => {
      const child = nodes.find((n) => n.value === t)
      expect(child).toBeDefined()
      expect(child!.depth).toBe(bookNode!.depth + 1)
    })

    // Total number of nodes = all document types present in DOCUMENT_TYPES keys
    const allDocumentTypes = Object.keys(DOCUMENT_TYPES)
    expect(nodes.map((n) => n.value)).toEqual(
      expect.arrayContaining(allDocumentTypes),
    )
  })
})
