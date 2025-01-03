import { PrismaClient } from '@prisma/client'

export class AbstractDAO {
  protected prismaClient: PrismaClient

  constructor() {
    this.prismaClient = new PrismaClient()
  }
}
