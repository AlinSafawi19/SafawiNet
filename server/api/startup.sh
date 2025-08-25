#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
npx wait-on tcp:postgres:5432

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (in case it's needed)
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting application..."
exec npm run start:dev
