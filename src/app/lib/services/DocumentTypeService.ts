import { DocumentType } from '@prisma/client'
import { DOCUMENT_TYPES } from '@/lib/services/DocumentTypes'

export { DOCUMENT_TYPES } from './DocumentTypes'

export type MenuNode = {
  value: DocumentType
  depth: number
  children?: MenuNode[]
}

export class DocumentTypeService {
  private static parentOf: Map<DocumentType, DocumentType> = (() => {
    const map = new Map<DocumentType, DocumentType>()
    for (const [parent, children] of Object.entries(DOCUMENT_TYPES) as Array<
      [DocumentType, DocumentType[]]
    >) {
      for (const child of children) map.set(child, parent)
    }
    return map
  })()

  static childrenOf(t: DocumentType): DocumentType[] {
    return DOCUMENT_TYPES[t] ?? []
  }

  static descendantsOf(
    t: DocumentType,
    opts: { includeSelf?: boolean } = {},
  ): DocumentType[] {
    const seen = new Set<DocumentType>()
    const out: DocumentType[] = []
    const stack = [...(DOCUMENT_TYPES[t] ?? [])]

    while (stack.length) {
      const cur = stack.pop()!
      if (seen.has(cur)) continue
      seen.add(cur)
      out.push(cur)
      stack.push(...(DOCUMENT_TYPES[cur] ?? []))
    }

    if (opts.includeSelf) out.unshift(t)
    return out
  }

  static ancestorsOf(
    t: DocumentType,
    opts: { includeSelf?: boolean; rootFirst?: boolean } = {},
  ): DocumentType[] {
    const { includeSelf = false, rootFirst = false } = opts
    const chain: DocumentType[] = []

    let cur: DocumentType | undefined = includeSelf ? t : this.parentOf.get(t)
    while (cur) {
      chain.push(cur)
      cur = this.parentOf.get(cur)
    }
    return rootFirst ? chain.reverse() : chain
  }

  static isA(a: DocumentType, b: DocumentType): boolean {
    if (a === b) return true
    return this.descendantsOf(b).includes(a)
  }

  /** Type guard for DocumentType */
  static isDocumentType(value: unknown): value is DocumentType {
    return Object.values(DocumentType).includes(value as DocumentType)
  }

  /**
   * Expand a list of types for query filters:
   * e.g. [ScholarlyPublication] -> [ScholarlyPublication, JournalArticle, ConferenceArticle, Book, Monograph, Proceedings, BookChapter]
   */
  static expandTypes(input: DocumentType[]): DocumentType[] {
    const out = new Set<DocumentType>()
    for (const t of input) {
      out.add(t)
      for (const d of this.descendantsOf(t)) out.add(d)
    }
    return Array.from(out)
  }

  /**
   * Return a flattened tree annotated with depth,
   * ready for building hierarchical menus or select options.
   * The root `Document` is included by default.
   */
  static toMenuTree(start: DocumentType = DocumentType.Document): MenuNode[] {
    const nodes: MenuNode[] = []

    const visit = (node: DocumentType, depth: number) => {
      nodes.push({ value: node, depth })
      for (const child of this.childrenOf(node)) visit(child, depth + 1)
    }

    visit(start, 0)
    return nodes
  }
}
