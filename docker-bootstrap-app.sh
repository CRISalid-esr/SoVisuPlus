#!/bin/sh
set -eu

# --- helpers ---------------------------------------------------------------
log() { printf '%s %s\n' "[$(date +'%Y-%m-%dT%H:%M:%S%z')]" "$*"; }

# --- build DATABASE_URL ----------------------------------------------------
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
export DATABASE_URL

# --- safe git (no warnings on failure) -------------------------------------
GIT_COMMIT_VAL="${GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || true)}"
[ -n "${GIT_COMMIT_VAL}" ] || GIT_COMMIT_VAL="unknown"

GIT_BRANCH_VAL="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)}"
[ -n "${GIT_BRANCH_VAL}" ] || GIT_BRANCH_VAL="unknown"

# --- write .env (append to existing if present) -----------------------------
# Quote values that may contain special chars/spaces
cat <<EOF >> .env
WS_SCHEME=${WS_SCHEME:-ws}
WS_HOST=${WS_HOST:-localhost}
WS_PORT=${WS_PORT:-3001}
WS_INTERNAL_PORT=${WS_INTERNAL_PORT:-3001}
WS_PATH=${WS_PATH:-/}
DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME:-unknown}
DOCKER_TAG=${DOCKER_TAG:-unknown}
DOCKER_DIGEST=${DOCKER_DIGEST:-unknown}
GIT_COMMIT=${GIT_COMMIT_VAL}
GIT_BRANCH=${GIT_BRANCH_VAL}
DATABASE_URL=${DATABASE_URL}
KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-}
KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-}"
KEYCLOAK_ISSUER=${KEYCLOAK_INTERNAL_ADDR:-}/realms/${KEYCLOAK_REALM:-}
KEYCLOAK_PUBLIC_URL=${KEYCLOAK_PUBLIC_ADDR:-http://keycloak.local:8080}/realms/${KEYCLOAK_REALM:-}
NEXTAUTH_URL=${APP_URL:-http://sovisuplus.local:3000}/api/auth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-}"
GRAPHQL_ENDPOINT_ENABLED="${GRAPHQL_ENDPOINT_ENABLED:-false}"
GRAPHQL_ENDPOINT_URL="${GRAPHQL_ENDPOINT_URL:-}"
GRAPHQL_API_KEY_ENABLED=${GRAPHQL_API_KEY_ENABLED:-false}
GRAPHQL_API_KEY="${GRAPHQL_API_KEY:-}"
ORCID_URL="${ORCID_URL:-https://orcid.org}"
ORCID_SCOPES="${ORCID_SCOPES:-/authenticate}"
ORCID_CLIENT_ID="${ORCID_CLIENT_ID:-}"
ORCID_CLIENT_SECRET="${ORCID_CLIENT_SECRET:-}"
VOCABS_URL="${VOCABS_URL:-http://localhost:8000/api/v0/autocomplete/}"
NEXT_PUBLIC_AVAILABLE_VOCABS="${NEXT_PUBLIC_AVAILABLE_VOCABS:-jel,aat,acm,mesh}"
EOF

log "Running Prisma migrations…"
if ! ./node_modules/.bin/prisma migrate deploy; then
  log "Prisma migrations FAILED. Exiting."
  exit 1
fi
log "Prisma migrations complete."

export NODE_PATH=/app/node_modules # for the listener to find shared modules
HOSTNAME="0.0.0.0" npm run start:web & npm run start:listener
wait