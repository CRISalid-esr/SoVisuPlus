#!/bin/sh
export DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public

cat <<EOF >> .env
DOCKER_IMAGE_NAME=$DOCKER_IMAGE_NAME
DOCKER_TAG=$DOCKER_TAG
DOCKER_DIGEST=$DOCKER_DIGEST
GIT_COMMIT=${GIT_COMMIT:-$(git rev-parse HEAD)}
GIT_BRANCH=${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}
DATABASE_URL=$DATABASE_URL
KEYCLOAK_CLIENT_ID=$KEYCLOAK_CLIENT_ID
KEYCLOAK_CLIENT_SECRET="$KEYCLOAK_CLIENT_SECRET"
KEYCLOAK_ISSUER=$KEYCLOAK_ADDR/realms/crisalid-p1ps
NEXTAUTH_URL=$APP_URL/api/auth
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
GRAPHQL_ENDPOINT_ENABLED="true"
GRAPHQL_ENDPOINT_URL="$GRAPHQL_ENDPOINT_URL"
GRAPHQL_API_KEY_ENABLED="true"
GRAPHQL_API_KEY="$GRAPHQL_API_KEY"
EOF

npx prisma migrate deploy

# npm warn exec The following package was not found and will be installed: prisma@5.22.0
rm -rf node_modules/prisma

export NODE_PATH=/app/node_modules # for the listener to find shared modules
HOSTNAME="0.0.0.0" npm run start:web & npm run start:listener
wait