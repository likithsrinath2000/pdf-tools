# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim

# Install runtime dependencies for PDF/image processing
RUN apt-get update && apt-get install -y \
    ghostscript \
    poppler-utils \
    qpdf \
    imagemagick \
    libreoffice \
    default-jre-headless \
    wkhtmltopdf \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client/public/tinymce ./dist/public/tinymce

# Create necessary directories
RUN mkdir -p uploads output_files temp_files logs && \
    chown -R appuser:appuser uploads output_files temp_files logs

# Switch to non-root user
USER appuser

# Expose port (Azure uses PORT env var, defaults to 8080)
EXPOSE 8080

# Set default port for Azure
ENV PORT=8080
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8080; require('http').get('http://localhost:' + port + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.cjs"]
