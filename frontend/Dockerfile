# Build Stage
FROM node:24-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY .env .env
RUN npm run build

# Production Stage
FROM nginx:stable-alpine

# Copy the build output from the builder stage to Nginx's default serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
