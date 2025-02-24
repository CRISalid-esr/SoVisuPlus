import {
  Contribution,
  Document,
  DocumentAbstract,
  DocumentTitle,
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

type ContributionWithRelations = Contribution & {
  person: Person
}

export type DocumentWithRelations = Document & {
  titles: DocumentTitle[]
  abstracts: DocumentAbstract[]
  contributions: ContributionWithRelations[]
}

export default prisma
