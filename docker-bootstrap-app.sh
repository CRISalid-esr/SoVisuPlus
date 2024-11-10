#!/bin/sh
export DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public
echo "DOCKER_IMAGE_NAME=$DOCKER_IMAGE_NAME" >> .env
echo "DOCKER_TAG=$DOCKER_TAG" >> .env
echo "DOCKER_DIGEST=$DOCKER_DIGEST" > .env
echo "GIT_COMMIT=$GIT_COMMIT" >> .env
echo "GIT_BRANCH=$GIT_BRANCH" >> .env
echo "DATABASE_URL=$DATABASE_URL" >> .env
npm ci --legacy-peer-deps  --include=dev
npx prisma generate
DISABLE_ESLINT_PLUGIN=true npm run build
npx prisma migrate deploy
npm run start