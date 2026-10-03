# ==========================================
# Stage 1: Build & Compile TypeScript
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies like typescript)
RUN npm install --include=dev

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/

# Compile TypeScript to dist/
RUN npm run build

# ==========================================
# Stage 2: Production Lightweight Image
# ==========================================
FROM node:22-alpine AS runner

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

# Install wget for container health checks
RUN apk add --no-cache wget

# Copy package manifests and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled JavaScript and SQL migrations from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Use non-root node user for security
USER node

# Expose default Fastify port
EXPOSE 3000

# Container healthcheck probe against Fastify /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the Fastify production server
CMD ["node", "dist/server.js"]
