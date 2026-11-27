# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Self-hosted image is always local-first; cloud mode is opt-in elsewhere.
ENV VITE_DATA_MODE=local

# Copy dependency manifests
COPY package.json package-lock.json ./

# Clean install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build production bundle
RUN npm run build

# Production Stage: Static Nginx Server
FROM nginx:alpine

# Copy custom nginx configuration for SPA routing & local security
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
