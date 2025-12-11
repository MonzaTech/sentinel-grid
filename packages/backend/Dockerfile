# ============================================================================
# Sentinel Grid Backend - Multi-Stage Dockerfile
# ============================================================================
# Build from project root: docker build -f packages/backend/Dockerfile .
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Build predictive-engine
# ----------------------------------------------------------------------------
FROM node:20-alpine AS engine-builder

WORKDIR /build/predictive-engine

# Copy predictive-engine package
COPY packages/predictive-engine/package*.json ./
RUN npm ci

COPY packages/predictive-engine/ ./
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2: Build backend
# ----------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /build/backend

# Copy predictive-engine build
COPY --from=engine-builder /build/predictive-engine /build/predictive-engine

# Copy backend package files
COPY packages/backend/package*.json ./

# Install dependencies (including local predictive-engine)
RUN npm ci

# Copy backend source
COPY packages/backend/ ./

# Build TypeScript
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 3: Production image
# ----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S sentinel && \
    adduser -S sentinel -u 1001

WORKDIR /app

# Copy built predictive-engine
COPY --from=engine-builder /build/predictive-engine/dist ./node_modules/@sentinel-grid/predictive-engine/dist
COPY --from=engine-builder /build/predictive-engine/package.json ./node_modules/@sentinel-grid/predictive-engine/

# Copy built backend
COPY --from=backend-builder /build/backend/dist ./dist
COPY --from=backend-builder /build/backend/node_modules ./node_modules
COPY --from=backend-builder /build/backend/package.json ./

# Create data directory
RUN mkdir -p /app/data && chown -R sentinel:sentinel /app

# Switch to non-root user
USER sentinel

# Environment
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
