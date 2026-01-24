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
NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-http://sovisuplus.local:3000}
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
NEXTAUTH_URL=${NEXT_PUBLIC_BASE_URL:-http://sovisuplus.local:3000}/api/auth
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
NEXT_PUBLIC_CAS_URL=${NEXT_PUBLIC_CAS_URL:-https://cas.ccsd.cnrs.fr/cas}
NEXT_CAS_CLIENT_SAML_TOLERANCE=${NEXT_CAS_CLIENT_SAML_TOLERANCE:-18000}
NEXT_CAS_CLIENT_SECRET="${NEXT_CAS_CLIENT_SECRET:-xxxxxx32carscasclientsecretxxxxx}"
EOF

CUSTOM_THEME_MOUNT="/custom-theme"
THEME_DIR="/app/public/theme"
use_custom_theme=false
if [ -d "${CUSTOM_THEME_MOUNT}" ] && [ "$(ls -A ${CUSTOM_THEME_MOUNT})" ]; then
  log "Using custom theme from mounted volume: ${CUSTOM_THEME_MOUNT}"
  use_custom_theme=true
else
  log "Using default theme"
fi

if $use_custom_theme; then
  echo "Custom theme detected at $CUSTOM_THEME_MOUNT — overriding /public/theme"
  rm -rf "${THEME_DIR}"
  cp -r "${CUSTOM_THEME_MOUNT}" "${THEME_DIR}"
else
  log "No custom theme found at: ${CUSTOM_THEME_MOUNT}"
fi

log "Running Prisma migrations…"
if ! ./node_modules/.bin/prisma migrate deploy; then
  log "Prisma migrations FAILED. Exiting."
  exit 1
fi
log "Prisma migrations complete."

log "Seeding RBAC roles…"
RBAC_DEFAULT="/app/rbac.roles.yaml"
RBAC_MOUNTED="/config/rbac.roles.yaml"
RBAC_FROM_ENV="${RBAC_ROLES_FILE:-}"

RBAC_FILE=""

if [ -n "$RBAC_FROM_ENV" ] && [ -f "$RBAC_FROM_ENV" ]; then
  RBAC_FILE="$RBAC_FROM_ENV"
elif [ -f "$RBAC_MOUNTED" ]; then
  RBAC_FILE="$RBAC_MOUNTED"
elif [ -f "$RBAC_DEFAULT" ]; then
  RBAC_FILE="$RBAC_DEFAULT"
fi

if [ "${INIT_ROLES_ON_START:-true}" = "true" ] && [ -n "$RBAC_FILE" ]; then
  log "Seeding RBAC roles from: $RBAC_FILE"
  npm run init_roles:js "$RBAC_FILE" || { log "RBAC seeding FAILED"; exit 1; }
else
  log "Skipping RBAC seeding (INIT_ROLES_ON_START=${INIT_ROLES_ON_START:-false}, file='${RBAC_FILE:-none}')"
fi


export NODE_PATH=/app/node_modules # for the listener to find shared modules
HOSTNAME="0.0.0.0" npm run start:web & npm run start:listener
wait