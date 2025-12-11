# ============================================================================
# Sentinel Grid Frontend - Multi-Stage Dockerfile
# ============================================================================
# Build from project root: docker build -f packages/frontend/Dockerfile .
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Build frontend
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY packages/frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY packages/frontend/ ./

# Set API URL for production build
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build for production
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2: Production image with nginx
# ----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copy custom nginx config
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /build/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
