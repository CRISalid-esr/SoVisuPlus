import { Literal } from '@/types/Literal'
import {
  ConceptLabelWithRelations as DbConceptLabel,
  ConceptWithRelations as DbConcept,
} from '@/prisma-schema/extended-client'

interface ConceptJson {
  uid: string
  uri: string | null
  prefLabels: Array<Literal>
  altLabels: Array<Literal>
}

enum ConceptVocabulary {
  WIKIDATA = 'WIKIDATA',
  IDREF = 'IDREF',
  JEL = 'JEL',
  ABES = 'ABES',
  UNKNOWN = 'UNKNOWN',
}

const VOCAB_PREFIX_MAP: Record<string, ConceptVocabulary> = {
  'http://www.wikidata.org': ConceptVocabulary.WIKIDATA,
  'http://www.idref.fr': ConceptVocabulary.IDREF,
  'http://zbw.eu': ConceptVocabulary.JEL,
  'http://hub.abes.fr': ConceptVocabulary.ABES,
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

  getVocabulary(): ConceptVocabulary | null {
    if (!this.uri) {
      return null
    }

    for (const prefix in VOCAB_PREFIX_MAP) {
      if (this.uri.startsWith(prefix)) {
        return VOCAB_PREFIX_MAP[prefix]
      }
    }

    return ConceptVocabulary.UNKNOWN
  }

  getIdentifier(): string {
    if (!this.uri) return ''

    const vocab = this.getVocabulary()
    if (!vocab) return ''

    switch (vocab) {
      case ConceptVocabulary.WIKIDATA: {
        const match = this.uri.match(/\/entity\/(Q\d+)/)
        return match ? match[1] : ''
      }
      case ConceptVocabulary.IDREF: {
        const match = this.uri.match(/idref\.fr\/(\d+)/)
        return match ? match[1] : ''
      }
      case ConceptVocabulary.JEL: {
        const match = this.uri.match(
          /zbw\.eu\/beta\/external_identifiers\/jel#(J\d+)/,
        )
        return match ? match[1] : ''
      }
      case ConceptVocabulary.ABES: {
        const match = this.uri.match(/\/subject\/([^/]+)/)
        return match ? match[1] : ''
      }
      default:
        return ''
    }
  }
}

export { Concept }
export type { ConceptJson }
export type { ConceptVocabulary }
