# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install git (needed for version badge git info extraction)
RUN apk add --no-cache git

# Copy dependency manifests first for Docker layer caching
COPY package*.json ./
COPY patches/ ./patches/
RUN npm ci

# Copy source code
COPY . .

# Build args for version injection (Coolify provides these automatically)
ARG COMMIT_SHA=unknown
ARG SOURCE_BRANCH=unknown

ENV VITE_APP_COMMIT=${COMMIT_SHA}
ENV VITE_APP_BRANCH=${SOURCE_BRANCH}
ENV VITE_APP_BUILD_TIME=${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}

# Build the Vite production bundle
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config with COOP/COEP headers
COPY nginx_anemoia.conf /etc/nginx/conf.d/default.conf

# Health check for Coolify and monitoring
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
