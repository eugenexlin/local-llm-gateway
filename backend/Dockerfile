# Build Stage
FROM node:24-trixie-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:24-trixie-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Ensure the database directory exists for persistence
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
