import '@testing-library/jest-dom'

import { execSync } from 'child_process'

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST

beforeEach(() => {
  execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
    } as NodeJS.ProcessEnv,
  })
})
