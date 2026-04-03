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
# .next/standalone includes a minimal node_modules with only traced runtime deps
COPY --from=builder --chown=labitat:nodejs /app/.next/standalone ./
COPY --from=builder --chown=labitat:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=labitat:nodejs /app/public ./public

# Create data directory for SQLite database and cache
RUN mkdir -p /data/cache && chown -R labitat:nodejs /data

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown labitat:nodejs /usr/local/bin/docker-entrypoint.sh

# Strip unnecessary packages to reduce image size
# wget is replaced by node-based healthcheck; apk cache and docs not needed at runtime
RUN rm -rf /usr/bin/wget /usr/share/man /var/cache/apk/* /tmp/*

# Switch to non-root user
USER labitat

# Expose port
EXPOSE 3000

# Health check using node (no wget needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application via entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
