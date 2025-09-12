# =============================================================================
# Production Dockerfile for Safawinet API
# =============================================================================
# This Dockerfile is optimized for production with minimal size and security
# =============================================================================

# Base image with Node.js 20 on Alpine Linux for smaller image size
FROM node:20-alpine

# =============================================================================
# System Dependencies
# =============================================================================
# Install system packages required for production
RUN apk add --no-cache \
    bash \
    curl \
    netcat-openbsd \
    && rm -rf /var/cache/apk/*

# =============================================================================
# Working Directory
# =============================================================================
WORKDIR /app

# =============================================================================
# Node.js and npm Configuration
# =============================================================================
# Configure npm for better network reliability and performance
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set audit false && \
    npm config set fund false

# =============================================================================
# Dependencies Installation
# =============================================================================
# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production --no-audit --no-fund --prefer-offline

# Generate Prisma client
RUN npx prisma generate

# =============================================================================
# Application Code
# =============================================================================
# Copy source code
COPY . .

# Build the application
RUN npm run build

# Make startup script executable
RUN chmod +x startup.sh

# =============================================================================
# Environment Configuration
# =============================================================================
# Set environment variables for production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# =============================================================================
# Security
# =============================================================================
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# =============================================================================
# Network Configuration
# =============================================================================
# Expose the application port
EXPOSE 3000

# =============================================================================
# Health Check
# =============================================================================
# Add health check for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# =============================================================================
# Application Startup
# =============================================================================
# Use the startup script that handles migrations and seeding
CMD ["./startup.sh"]
