/**
 * Prisma client instance as a singleton
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default prisma
