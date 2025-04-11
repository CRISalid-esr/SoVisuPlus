import { Literal } from '@/types/Literal'
import {
  ConceptLabelWithRelations as DbConceptLabel,
  ConceptWithRelations as DbConcept,
} from '@/prisma-schema/extended-client'

interface ConceptLabelRaw {
  id: number
  conceptId: number
  language: string
  value: string
  type: 'PREF' | 'ALT'
}

interface ConceptJson {
  uid: string
  uri: string | null
  labels?: Array<ConceptLabelRaw>
}

class Concept {
  constructor(
    public uid: string,
    public prefLabels: Array<Literal> = [],
    public altLabels: Array<Literal> = [],
    public uri: string | null = null,
  ) {}

  static fromObject(concept: ConceptJson): Concept {
    const altLabels = concept.labels
      ?.filter((label) => label.type === 'ALT')
      .map(Literal.fromObject)

    const prefLabels = concept.labels
      ?.filter((label) => label.type === 'PREF')
      .map(Literal.fromObject)

    return new Concept(concept.uid, prefLabels, altLabels, concept.uri)
  }

  static fromDbConcept(concept: DbConcept): Concept {
    return new Concept(
      concept.uid,
      concept.labels
        .filter((label: DbConceptLabel) => label.type === 'PREF')
        .map((label: DbConceptLabel) => Literal.fromDbLiteral(label)),
      concept.labels
        .filter((label: DbConceptLabel) => label.type === 'ALT')
        .map((label: DbConceptLabel) => Literal.fromDbLiteral(label)),
      concept.uri,
    )
  }
}

export { Concept }
export type { ConceptJson }
