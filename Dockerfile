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

RUN apk add --no-cache curl

COPY package.json package-lock.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER brimble-paas

EXPOSE 4017
EXPOSE 9464

CMD ["node", "dist/server.js"]