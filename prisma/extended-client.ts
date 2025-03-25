import {
  Concept,
  ConceptLabel,
  Contribution,
  Document,
  DocumentAbstract,
  DocumentRecord,
  DocumentTitle,
  LabelType,
  Person,
  PrismaClient,
  ResearchStructure,
  ResearchStructureDescription,
  ResearchStructureName,
} from '@prisma/client'

const prisma = new PrismaClient()

export type ResearchStructureWithRelations = ResearchStructure & {
  names: ResearchStructureName[]
  descriptions: ResearchStructureDescription[]
}

export type ContributionWithRelations = Contribution & {
  person: Person
}

export type DocumentWithRelations = Document & {
  titles: DocumentTitle[]
  abstracts: DocumentAbstract[]
  subjects: ConceptWithRelations[]
  contributions: ContributionWithRelations[]
  records: DocumentRecord[]
}

export type ConceptWithRelations = Concept & {
  labels: ConceptLabelWithRelations[]
}

export type ConceptLabelWithRelations = ConceptLabel & {
  type: LabelType
}

export default prisma
