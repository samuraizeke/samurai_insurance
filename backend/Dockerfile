# backend/Dockerfile
# Security-hardened multi-stage container for Cloud Run

# ============================================
# Stage 1: Build
# Pin to SHA digest for supply chain security
# ============================================
FROM node:20-alpine@sha256:643e7036aa985317ebfee460005e322aa550c6b6883000d01daefb58689a58e2 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for TypeScript)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production
# Pin to SHA digest for supply chain security
# ============================================
FROM node:20-alpine@sha256:643e7036aa985317ebfee460005e322aa550c6b6883000d01daefb58689a58e2

# Create non-root user for security (CIS Docker Benchmark 4.1)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose the port Google expects (8080)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production

# Start the app
CMD ["node", "dist/server.js"]
