#!/bin/sh
echo "DATABASE_URL=$DATABASE_URL" > .env
npm ci --legacy-peer-deps  --include=dev
npx prisma generate
DISABLE_ESLINT_PLUGIN=true npm run build
npx prisma migrate deploy
npm run start