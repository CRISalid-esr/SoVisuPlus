# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine

ENV PORT=3000
ENV NODE_ENV=production

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --legacy-peer-deps  --include=dev; \
  else echo "Lockfile not found." && exit 1; \
  fi

COPY . .
COPY .env.staging.sample .env.production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

RUN mkdir -p ./.next/static ./.next/standalone ./node_modules/prisma ./node_modules/.prisma
RUN chown -R nextjs:nodejs ./.next ./.next/static ./.next/standalone ./node_modules/prisma ./node_modules/.prisma
RUN touch .env && chown nextjs:nodejs .env && chmod u+w .env

USER nextjs

EXPOSE $PORT

ENTRYPOINT ["sh", "./docker-bootstrap-app.sh"]