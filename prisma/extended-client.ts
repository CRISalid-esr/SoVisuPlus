import {
  Contribution,
  Document,
  DocumentAbstract,
  DocumentTitle,
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

export type DocumentWithRelations = Document & {
  titles: DocumentTitle[]
  abstracts: DocumentAbstract[]
  contributions: Contribution[]
}

export default prisma
