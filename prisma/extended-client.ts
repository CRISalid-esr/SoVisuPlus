import {
  Concept,
  ConceptLabel,
  Contribution,
  Document,
  DocumentAbstract,
  DocumentRecord,
  DocumentState,
  DocumentTitle,
  HalSubmitType,
  Journal,
  JournalIdentifier,
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

export type DocumentRecordWithRelations = DocumentRecord & {
  halSubmitType: HalSubmitType | null
}

export type JournalWithRelations = Journal & {
  identifiers: JournalIdentifier[]
}

export type DocumentWithRelations = Document & {
  titles: DocumentTitle[]
  abstracts: DocumentAbstract[]
  subjects: ConceptWithRelations[]
  contributions: ContributionWithRelations[]
  records: DocumentRecordWithRelations[]
  journal: JournalWithRelations | null
  state: DocumentState
}

export type ConceptWithRelations = Concept & {
  labels: ConceptLabelWithRelations[]
}

export type ConceptLabelWithRelations = ConceptLabel & {
  type: LabelType
}

export default prisma
