import '@testing-library/jest-dom'

import { execSync } from 'child_process'

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST

beforeEach(() => {
  execSync('npx prisma migrate reset --force', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
    } as NodeJS.ProcessEnv,
  })
})
