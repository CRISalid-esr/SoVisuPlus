import { PrismaClient } from '@prisma/client'

export type DbStatus = 'connected' | 'not connected'

export type DbCheckup = {
  dbStatus: DbStatus
  dbError: Error | null
}

export const dbCheckup = async (): Promise<DbCheckup> => {
  const prisma = new PrismaClient()
  let dbStatus: DbStatus
  let dbError: Error | null = null
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (error) {
    dbError = error as Error
    dbStatus = 'not connected'
    console.log(error)
  }

  return {
    dbStatus,
    dbError,
  }
}
