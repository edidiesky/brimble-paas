FROM node:18-alpine AS builder

WORKDIR /app

RUN addgroup -g 1001 brimble-paas && \
    adduser -S brimble-paas -u 1001 -G brimble-paas

COPY package.json package-lock.json ./

RUN apk add --no-cache curl && npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npx tsc

FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 brimble-paas && \
    adduser -S brimble-paas -u 1001 -G brimble-paas

RUN apk add --no-cache curl git docker-cli

RUN curl -fsSL https://railpack.io/install.sh | sh

COPY package.json package-lock.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/workspaces/uploads && \
    chown -R brimble-paas:brimble-paas /app/workspaces

RUN addgroup -S docker || true && \
    adduser brimble-paas docker || true

USER brimble-paas

EXPOSE 3000
EXPOSE 9464

CMD ["node", "dist/server.js"]