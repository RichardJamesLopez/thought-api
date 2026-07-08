FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json drizzle.config.ts ./
COPY src/ src/
COPY drizzle/ drizzle/
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache libstdc++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ dist/
COPY drizzle/ drizzle/

RUN mkdir -p /app/data

ENV DB_PATH=/app/data/thought.db
ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "dist/index.js"]
