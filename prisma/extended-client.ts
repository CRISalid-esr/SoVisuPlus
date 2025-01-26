import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type ResearchStructureWithRelations = Prisma.ResearchStructure & {
  names: Prisma.ResearchStructureName[]
  descriptions: Prisma.ResearchStructureDescription[]
}

export type DocumentWithRelations = Prisma.Document & {
  titles: Prisma.DocumentTitle[]
  abstracts: Prisma.DocumentAbstract[]
  contributions: Prisma.Contribution[]
}

export default prisma
