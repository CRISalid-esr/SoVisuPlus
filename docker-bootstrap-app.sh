#!/bin/sh
export DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public

cat <<EOF >> .env
DOCKER_IMAGE_NAME=$DOCKER_IMAGE_NAME
DOCKER_TAG=$DOCKER_TAG
DOCKER_DIGEST=$DOCKER_DIGEST
GIT_COMMIT=${GIT_COMMIT:-$(git rev-parse HEAD)}
GIT_BRANCH=${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}
DATABASE_URL=$DATABASE_URL
EOF

npx prisma migrate deploy

# npm warn exec The following package was not found and will be installed: prisma@5.22.0
rm -rf node_modules/prisma

HOSTNAME="0.0.0.0" node server.js