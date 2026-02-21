import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { Document as DocumentClass, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Journal } from '@/types/Journal'
import xpath from 'xpath'

/**
 * HAL TEI (AOfr profile) interchange service.
 *
 * Goals:
 * - fromHalTEI(xml) -> DocumentClass
 * - toHalTEI(document, opts?)
 *
 */
export class HalTEIInterchangeService {
  private readonly domParser = new DOMParser()
  private readonly xmlSerializer = new XMLSerializer()

  /**
   * Mapping between Prisma DocumentType and HAL halTypology.
   *
   */
  private static readonly HAL_TYPOLOGY_TO_DOCUMENT_TYPE: Readonly<
    Record<string, DocumentType>
  > = Object.freeze({
    ART: DocumentType.Article,
    COMM: DocumentType.ConferenceArticle,
    PROCEEDINGS: DocumentType.Proceedings,

    // Books / monographs
    OUV: DocumentType.Book,
    COUV: DocumentType.BookChapter,

    // Theses / reports
    THESE: DocumentType.ScholarlyPublication,
    HDR: DocumentType.ScholarlyPublication,
    MEM: DocumentType.ScholarlyPublication,
    REPORT: DocumentType.ScholarlyPublication,
    REPORT_LABO: DocumentType.ScholarlyPublication,

    // Posters / presentations
    POSTER: DocumentType.Presentation,
    PRESCONF: DocumentType.Presentation,
    LECTURE: DocumentType.Presentation,

    // Comments / notes / blog
    NOTE: DocumentType.Comment,
    BLOG: DocumentType.Comment,

    // Fallback
    NOTICE: DocumentType.Document,
    OTHER: DocumentType.Document,
    UNDEFINED: DocumentType.Document,
    ISSUE: DocumentType.Document,
    PATENT: DocumentType.Document,
    IMG: DocumentType.Document,
    MAP: DocumentType.Document,
    VIDEO: DocumentType.Document,
    SOFTWARE: DocumentType.Document,
    TRAD: DocumentType.Document,
    SON: DocumentType.Document,
  })

  private static readonly DOCUMENT_TYPE_TO_HAL_TYPOLOGY: Readonly<
    Record<DocumentType, string>
  > = Object.freeze({
    [DocumentType.Document]: 'UNDEFINED',
    [DocumentType.ScholarlyPublication]: 'UNDEFINED',
    [DocumentType.Presentation]: 'PRESCONF',
    [DocumentType.Article]: 'ART',
    [DocumentType.ConferenceAbstract]: 'COMM',
    [DocumentType.Preface]: 'OTHER',
    [DocumentType.Comment]: 'NOTE',
    [DocumentType.JournalArticle]: 'ART',
    [DocumentType.Book]: 'OUV',
    [DocumentType.Monograph]: 'OUV',
    [DocumentType.BookChapter]: 'COUV',
    [DocumentType.BookOfChapters]: 'OUV',
    [DocumentType.ConferenceArticle]: 'COMM',
    [DocumentType.Proceedings]: 'PROCEEDINGS',
  })

  /**
   * Parse HAL TEI XML into DocumentClass model
   */
  public fromHalTEI(xml: string): DocumentClass {
    const dom = this.parseXml(xml)

    const uid = 'UNKNOWN'
    const documentType = this.readDocumentType(dom)

    const titles = this.readTitles(dom)
    const abstracts = this.readAbstracts(dom)

    const publicationDate = this.readPublicationDate(dom)
    const journal = this.readJournal(dom)
    const { volume, issue, pages } = this.readImprintBiblScopes(dom)

    return new DocumentClass(
      uid,
      documentType,
      null, // oaStatus
      publicationDate,
      null,
      null,
      null, // upwOAStatus
      titles,
      abstracts,
      [], // subjects
      [], // contributions
      [], // records
      undefined,
      journal ?? undefined,
      volume ?? undefined,
      issue ?? undefined,
      pages ?? undefined,
    )
  }

  /**
   * Convert a DocumentClass into HAL TEI XML (AOfr-TEI).
   */
  public toHalTEI(document: DocumentClass): string {
    const lang = this.pickMainLanguage(document)

    const dom = this.domParser.parseFromString(
      this.minimalTeiSkeletonXml(),
      'text/xml',
    )

    this.patchDocumentType(dom, document.documentType)
    this.patchTitles(dom, document.titles)
    this.patchAbstracts(dom, document.abstracts)
    this.patchLangUsage(dom, lang)

    if (document.journal) {
      this.patchJournalAndImprint(dom, document.journal, {
        volume: document.volume ?? null,
        issue: document.issue ?? null,
        pages: document.pages ?? null,
        publicationDate: document.publicationDate ?? null,
      })
    }

    return this.serialize(dom)
  }

  private parseXml(xml: string): Document {
    return this.domParser.parseFromString(xml, 'text/xml')
  }

  private serialize(dom: Document): string {
    return this.xmlSerializer.serializeToString(dom)
  }

  /** classCode[@scheme='halTypology']/@n (e.g., ART, COMM, THESE). */
  private readDocumentType(dom: Document): DocumentType {
    const halTypology =
      this.firstAttr(
        dom,
        "//*[local-name()='classCode' and @scheme='halTypology']",
        'n',
      ) ?? 'UNDEFINED'

    return (
      HalTEIInterchangeService.HAL_TYPOLOGY_TO_DOCUMENT_TYPE[halTypology] ??
      DocumentType.Document
    )
  }

  private readTitles(dom: Document): Literal[] {
    const titleNodes = this.selectNodes(
      dom,
      "//*[local-name()='titleStmt']/*[local-name()='title' and (not(@type) or @type!='sub')]",
    )
    const titles = titleNodes
      .map((n) => {
        const value = this.nodeText(n)
        const lang = (n as Element).getAttribute('xml:lang') || null
        if (!value) return null
        return Literal.fromObject({ value, language: lang })
      })
      .filter((x): x is Literal => !!x)

    if (titles.length === 0) {
      const analytic = this.selectNodes(
        dom,
        "//*[local-name()='analytic']/*[local-name()='title' and (not(@type) or @type!='sub')]",
      )
      return analytic
        .map((n) => {
          const value = this.nodeText(n)
          const lang = (n as Element).getAttribute('xml:lang') || null
          if (!value) return null
          return Literal.fromObject({ value, language: lang })
        })
        .filter((x): x is Literal => !!x)
    }

    return titles
  }

  private readAbstracts(dom: Document): Literal[] {
    const nodes = this.selectNodes(dom, "//*[local-name()='abstract']")
    return nodes
      .map((n) => {
        const value = this.nodeText(n)
        const lang = (n as Element).getAttribute('xml:lang') || null
        if (!value) return null
        return Literal.fromObject({ value, language: lang })
      })
      .filter((x): x is Literal => !!x)
  }

  private readPublicationDate(dom: Document): string | null {
    const v =
      this.firstText(
        dom,
        "//*[local-name()='imprint']/*[local-name()='date' and (@type='datePub' or @type='dateEpub')]",
      ) ?? null
    return v?.trim() || null
  }

  private readJournal(dom: Document): Journal | null {
    const title =
      this.firstText(
        dom,
        "//*[local-name()='monogr']/*[local-name()='title' and @level='j']",
      ) ?? null
    if (!title) return null

    const issnL =
      this.firstText(
        dom,
        "//*[local-name()='monogr']/*[local-name()='idno' and (@type='issn' or @type='eissn')]",
      ) ?? ''

    const publisher =
      this.firstText(
        dom,
        "//*[local-name()='imprint']/*[local-name()='publisher']",
      ) ?? ''

    return new Journal(title.trim(), issnL.trim(), publisher.trim(), [])
  }

  private readImprintBiblScopes(dom: Document): {
    volume: string | null
    issue: string | null
    pages: string | null
  } {
    const volume =
      this.firstText(
        dom,
        "//*[local-name()='imprint']/*[local-name()='biblScope' and @unit='volume']",
      ) ?? null
    const issue =
      this.firstText(
        dom,
        "//*[local-name()='imprint']/*[local-name()='biblScope' and @unit='issue']",
      ) ?? null
    const pages =
      this.firstText(
        dom,
        "//*[local-name()='imprint']/*[local-name()='biblScope' and (@unit='pp' or @unit='pages')]",
      ) ?? null

    return {
      volume: volume?.trim() || null,
      issue: issue?.trim() || null,
      pages: pages?.trim() || null,
    }
  }

  private minimalTeiSkeletonXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<TEI>
  <text>
    <body>
      <listBibl>
        <biblFull>
          <titleStmt></titleStmt>
          <sourceDesc>
            <biblStruct>
              <analytic></analytic>
              <monogr>
                <title level="j"></title>
                <imprint></imprint>
              </monogr>
            </biblStruct>
          </sourceDesc>
          <profileDesc>
            <langUsage></langUsage>
            <textClass></textClass>
          </profileDesc>
        </biblFull>
      </listBibl>
    </body>
  </text>
</TEI>`
  }

  private patchDocumentType(dom: Document, documentType: DocumentType): void {
    const code = this.mapDocumentTypeToHalTypology(documentType)

    const textClass = this.ensureElement(
      dom,
      "//*[local-name()='profileDesc']/*[local-name()='textClass']",
      () => this.createElement(dom, 'textClass'),
    )

    this.removeAll(
      dom,
      "//*[local-name()='classCode' and @scheme='halTypology']",
    )

    const classCode = this.createElement(dom, 'classCode')
    classCode.setAttribute('scheme', 'halTypology')
    classCode.setAttribute('n', code)
    textClass.appendChild(classCode)
  }

  private patchTitles(dom: Document, titles: Literal[]): void {
    const titleStmt = this.ensureElement(
      dom,
      "//*[local-name()='biblFull']/*[local-name()='titleStmt']",
      () => this.createElement(dom, 'titleStmt'),
    )

    this.removeAllWithin(titleStmt, "./*[local-name()='title']")

    for (const t of titles) {
      const title = this.createElement(dom, 'title')
      if (t.language) title.setAttribute('xml:lang', t.language)
      title.appendChild(dom.createTextNode(t.value))
      titleStmt.appendChild(title)
    }
  }

  private patchAbstracts(dom: Document, abstracts: Literal[]): void {
    const profileDesc = this.ensureElement(
      dom,
      "//*[local-name()='biblFull']/*[local-name()='profileDesc']",
      () => this.createElement(dom, 'profileDesc'),
    )

    this.removeAllWithin(profileDesc, "./*[local-name()='abstract']")

    for (const a of abstracts) {
      const abs = this.createElement(dom, 'abstract')
      if (a.language) abs.setAttribute('xml:lang', a.language)
      abs.appendChild(dom.createTextNode(a.value))
      profileDesc.appendChild(abs)
    }
  }

  private patchLangUsage(dom: Document, lang: string): void {
    const langUsage = this.ensureElement(
      dom,
      "//*[local-name()='profileDesc']/*[local-name()='langUsage']",
      () => this.createElement(dom, 'langUsage'),
    )
    this.removeAllWithin(langUsage, "./*[local-name()='language']")

    const language = this.createElement(dom, 'language')
    language.setAttribute('ident', lang)
    langUsage.appendChild(language)
  }

  private patchJournalAndImprint(
    dom: Document,
    journal: Journal,
    imprint: {
      volume: string | null
      issue: string | null
      pages: string | null
      publicationDate: string | null
    },
  ): void {
    const monogr = this.ensureElement(
      dom,
      "//*[local-name()='biblStruct']/*[local-name()='monogr']",
      () => this.createElement(dom, 'monogr'),
    )

    const journalTitle = this.ensureElementWithin(
      monogr,
      "./*[local-name()='title' and @level='j']",
      () => {
        const t = this.createElement(dom, 'title')
        t.setAttribute('level', 'j')
        return t
      },
    )
    this.setText(journalTitle, journal.title)

    const imprintEl = this.ensureElementWithin(
      monogr,
      "./*[local-name()='imprint']",
      () => this.createElement(dom, 'imprint'),
    )

    this.upsertBiblScope(dom, imprintEl, 'volume', imprint.volume)
    this.upsertBiblScope(dom, imprintEl, 'issue', imprint.issue)
    this.upsertBiblScope(dom, imprintEl, 'pp', imprint.pages)

    if (imprint.publicationDate) {
      const datePub = this.ensureElementWithin(
        imprintEl,
        "./*[local-name()='date' and @type='datePub']",
        () => {
          const d = this.createElement(dom, 'date')
          d.setAttribute('type', 'datePub')
          return d
        },
      )
      this.setText(datePub, imprint.publicationDate)
    }
  }

  private upsertBiblScope(
    dom: Document,
    imprintEl: Element,
    unit: string,
    value: string | null,
  ) {
    if (!value) {
      this.removeAllWithin(
        imprintEl,
        `./*[local-name()='biblScope' and @unit='${unit}']`,
      )
      return
    }

    const el = this.ensureElementWithin(
      imprintEl,
      `./*[local-name()='biblScope' and @unit='${unit}']`,
      () => {
        const b = this.createElement(dom, 'biblScope')
        b.setAttribute('unit', unit)
        return b
      },
    )
    this.setText(el, value)
  }

  private selectNodes(dom: Document, expr: string): Node[] {
    return xpath.select(expr, dom) as Node[]
  }

  private firstText(dom: Document, expr: string): string | null {
    const node = (xpath.select1(expr, dom) as Node | undefined) ?? undefined
    if (!node) return null
    return this.nodeText(node)
  }

  private firstAttr(dom: Document, expr: string, attr: string): string | null {
    const node = (xpath.select1(expr, dom) as Element | undefined) ?? undefined
    if (!node || !node.getAttribute) return null
    const v = node.getAttribute(attr)
    return v ? v : null
  }

  private nodeText(node: Node): string {
    const t = node.textContent as string | undefined
    return (t ?? '').trim()
  }

  private createElement(dom: Document, tagName: string): Element {
    return dom.createElement(tagName)
  }

  private setText(el: Element, value: string): void {
    while (el.firstChild) el.removeChild(el.firstChild)
    el.appendChild(el.ownerDocument!.createTextNode(value))
  }

  private ensureElement(
    dom: Document,
    expr: string,
    create: () => Element,
  ): Element {
    const found = (xpath.select1(expr, dom) as Element | undefined) ?? undefined
    if (found) return found

    const biblFull = xpath.select1("//*[local-name()='biblFull']", dom) as
      | Element
      | undefined
    const el = create()
    if (biblFull) biblFull.appendChild(el)
    return el
  }

  private ensureElementWithin(
    parent: Element,
    relativeExpr: string,
    create: () => Element,
  ): Element {
    const found =
      (xpath.select1(relativeExpr, parent) as Element | undefined) ?? undefined
    if (found) return found
    const el = create()
    parent.appendChild(el)
    return el
  }

  private removeAll(dom: Document, expr: string): void {
    const nodes = this.selectNodes(dom, expr)
    for (const n of nodes) {
      if (n.parentNode) n.parentNode.removeChild(n)
    }
  }

  private removeAllWithin(parent: Element, relativeExpr: string): void {
    const nodes = xpath.select(relativeExpr, parent) as Node[]
    for (const n of nodes) {
      if (n.parentNode) n.parentNode.removeChild(n)
    }
  }

  private pickMainLanguage(document: DocumentClass): string {
    const l = document.titles.find((t) => !!t.language)?.language
    return l && l !== 'ul' ? l : 'fr'
  }

  private mapDocumentTypeToHalTypology(documentType: DocumentType): string {
    return (
      HalTEIInterchangeService.DOCUMENT_TYPE_TO_HAL_TYPOLOGY[documentType] ??
      'UNDEFINED'
    )
  }
}
