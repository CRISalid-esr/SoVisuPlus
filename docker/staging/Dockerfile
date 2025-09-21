# syntax=docker.io/docker/dockerfile:1


FROM node:22-alpine AS base


FROM base AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci  --legacy-peer-deps --ignore-scripts --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env.docker .env

RUN npx prisma generate
RUN npm run build
RUN npm run build:listener

FROM base AS runner

RUN set -ex; \
    apk update; \
    apk add --no-cache \
    openssl; \
    apk add --no-cache  \
    git

WORKDIR /app

ENV NODE_ENV=production

ARG GIT_COMMIT
ARG GIT_BRANCH

ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist-listener ./dist-listener
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

RUN touch .env && chown nextjs:nodejs .env

# queries are not bundled in the build, so we need to copy them manually
COPY --from=builder --chown=nextjs:nodejs /app/src/app/lib/graphql/queries /app/src/app/lib/graphql/queries

COPY ../../docker-bootstrap-app.sh ./

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENTRYPOINT ["sh", "./docker-bootstrap-app.sh"]