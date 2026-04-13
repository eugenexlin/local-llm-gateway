# Build Stage
FROM node:24-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Ensure the database directory exists for persistence
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
