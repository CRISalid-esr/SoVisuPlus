import { Literal } from '@/types/Literal'

interface ConceptJson {
  uid: string
  altLabels: Array<Literal>
  prefLabels: Array<Literal>
  uri: string | null
}

class Concept {
  constructor(
    public uid: string,
    public altLabels: Array<Literal>,
    public prefLabels: Array<Literal>,
    public uri: string | null = null,
  ) {}

  static fromObject(concept: ConceptJson): Concept {
    return new Concept(
      concept.uid,
      concept.altLabels?.map((label) => Literal.fromObject(label)),
      concept.prefLabels?.map((label) => Literal.fromObject(label)),
      concept.uri,
    )
  }
}

export { Concept }
export type { ConceptJson }
