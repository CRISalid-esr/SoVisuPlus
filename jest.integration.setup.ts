import prisma from '@/lib/daos/prisma'
import '@testing-library/jest-dom'

import { execSync } from 'child_process'

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST

beforeAll(() => {
  execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
    } as NodeJS.ProcessEnv,
  })
})

const clearDatabase = async () => {
  console.log('****Clearing database...')
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "PersonIdentifier", 
      "User", 
      "Person",
      "ResearchStructure",
      "ResearchStructureIdentifier"
    RESTART IDENTITY CASCADE;
  `)
  console.log('****Database cleared')
}

beforeEach(async () => {
  await clearDatabase()
})

afterAll(async () => {
  await prisma.$disconnect()
})
