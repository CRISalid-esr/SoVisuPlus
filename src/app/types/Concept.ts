import { Literal } from '@/types/Literal'
import {
  ConceptLabelWithRelations as DbConceptLabel,
  ConceptWithRelations as DbConcept,
} from '@/prisma-schema/extended-client'

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

  static fromDbConcept(concept: DbConcept): Concept {
    return new Concept(
      concept.uid,
      concept.labels
        .filter((label: DbConceptLabel) => label.type === 'ALT')
        .map((label: DbConceptLabel) => Literal.fromDbLiteral(label)),
      concept.labels
        .filter((label: DbConceptLabel) => label.type === 'PREF')
        .map((label: DbConceptLabel) => Literal.fromDbLiteral(label)),
      concept.uri,
    )
  }
}

export { Concept }
export type { ConceptJson }
