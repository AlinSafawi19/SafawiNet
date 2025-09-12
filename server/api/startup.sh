#!/bin/bash

# =============================================================================
# Safawinet API Startup Script
# =============================================================================
# This script handles database migrations and seeding before starting the API
# =============================================================================

set -e  # Exit on any error

echo "🚀 Starting Safawinet API..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until nc -z postgres 5432; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Run database seeding
echo "🌱 Running database seeding..."
npx prisma db seed

# Start the application
echo "🎯 Starting API server..."
if [ "$NODE_ENV" = "production" ]; then
  echo "🏭 Starting in production mode..."
  npm run start:prod
else
  echo "🔧 Starting in development mode..."
  npm run start:dev
fi
