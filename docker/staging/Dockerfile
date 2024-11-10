# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine

ENV PORT=3000
ENV NODE_ENV=production

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY . .
COPY .env.staging.sample .env.production

ARG GIT_COMMIT
ARG GIT_BRANCH

ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}

USER root

EXPOSE $PORT

ENTRYPOINT ["sh", "./docker-bootstrap-app.sh"]