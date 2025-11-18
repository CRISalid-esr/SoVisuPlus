import { Literal } from '@/types/Literal'
import {
  ConceptLabelWithRelations as DbConceptLabel,
  ConceptWithRelations as DbConcept,
} from '@/prisma-schema/extended-client'
import { VOCABS } from '@/lib/services/Vocabs'

interface ConceptJson {
  uid: string
  uri: string | null
  prefLabels: Array<Literal>
  altLabels: Array<Literal>
}

class Concept {
  constructor(
    public uid: string,
    public prefLabels: Array<Literal> = [],
    public altLabels: Array<Literal> = [],
    public uri: string | null = null,
  ) {}

  static toJson(concept: Concept): ConceptJson {
    return {
      uid: concept.uid,
      uri: concept.uri,
      prefLabels: concept.prefLabels,
      altLabels: concept.altLabels,
    }
  }

  static fromObject(concept: ConceptJson): Concept {
    const altLabels = concept.altLabels.map(Literal.fromObject)
    const prefLabels = concept.prefLabels.map(Literal.fromObject)

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

  getVocabulary(): string | null {
    if (!this.uri) {
      return null
    }
    for (const vocab in VOCABS) {
      if (this.uri.match(VOCABS[vocab].iriPatterns[0])) {
        return vocab
      }
    }
    return 'UNKNOWN'
  }

  getIdentifier(): string {
    if (!this.uri) return ''

    const vocab = this.getVocabulary()
    if (!vocab || vocab == 'UNKNOWN') return ''
    return (
      this.uri.match(VOCABS[vocab].iriPatterns[0])?.groups?.identifier ?? ''
    )
  }
}

export { Concept }
export type { ConceptJson }
