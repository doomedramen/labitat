# Labitat Dockerfile
# Multi-stage build for production deployment

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies — skip lifecycle scripts (no git repo in build context)
# then rebuild native modules (better-sqlite3, sharp, etc.) explicitly
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild better-sqlite3 sharp esbuild

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/data/labitat.db
ENV HOSTNAME=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 labitat

# Copy built application from builder
COPY --from=builder --chown=labitat:nodejs /app/.next/standalone ./
COPY --from=builder --chown=labitat:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=labitat:nodejs /app/public ./public
COPY --from=builder --chown=labitat:nodejs /app/package.json ./
COPY --from=builder --chown=labitat:nodejs /app/config.yaml.example ./
COPY --from=builder --chown=labitat:nodejs /app/node_modules ./node_modules
# drizzle.config.ts and lib/ are needed for migrations at runtime
COPY --from=builder --chown=labitat:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=labitat:nodejs /app/lib ./lib

# Create data directory for SQLite database and cache
RUN mkdir -p /data/cache && chown -R labitat:nodejs /data

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown labitat:nodejs /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER labitat

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application via entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
