import { PrismaClient } from '@prisma/client'
import prisma from '@/lib/daos/prisma'

export class AbstractDAO {
  protected prismaClient: PrismaClient

  constructor() {
    this.prismaClient = prisma
  }
}
