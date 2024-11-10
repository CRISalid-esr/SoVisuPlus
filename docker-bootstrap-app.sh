#!/bin/sh
export DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public
echo "DOCKER_IMAGE_NAME=$DOCKER_IMAGE_NAME" >> .env
echo "DOCKER_TAG=$DOCKER_TAG" >> .env
echo "DOCKER_DIGEST=$DOCKER_DIGEST" >> .env
echo "[Git commit from env var] $GIT_COMMIT"
echo "GIT_COMMIT=${GIT_COMMIT:-$(git rev-parse HEAD)}" >> .env
echo "[Git branch from env var] $GIT_BRANCH"
echo "GIT_BRANCH=${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}" >> .env
echo "*******"
cat .env
echo "*******"
echo "DATABASE_URL=$DATABASE_URL" >> .env
echo "+> Install dependencies"
npm ci --legacy-peer-deps  --include=dev
echo "+> Generate Prisma Client"
npx prisma generate
echo "+> Build the app"
DISABLE_ESLINT_PLUGIN=true npm run build
echo "+> Run the Prisma migrations"
npx prisma migrate deploy
echo "+> Start the app"
npm run start