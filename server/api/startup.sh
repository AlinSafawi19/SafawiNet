#!/bin/sh

set -e

# Function to log messages with timestamps
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to wait for database with timeout
wait_for_db() {
    log "Waiting for database to be ready..."
    timeout=60
    counter=0
    
    while ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; do
        counter=$((counter + 1))
        if [ $counter -ge $timeout ]; then
            log "ERROR: Database connection timeout after ${timeout} seconds"
            exit 1
        fi
        log "Database not ready, waiting... (${counter}/${timeout})"
        sleep 2
    done
    log "Database is ready!"
}

# Function to run migrations with retry logic
run_migrations() {
    log "Running database migrations..."
    max_retries=3
    retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
            log "Migrations completed successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            log "Migration failed, attempt ${retry_count}/${max_retries}"
            if [ $retry_count -lt $max_retries ]; then
                sleep 5
            fi
        fi
    done
    
    log "ERROR: Failed to run migrations after ${max_retries} attempts"
    exit 1
}

# Function to generate Prisma client
generate_prisma_client() {
    log "Generating Prisma client..."
    if npx prisma generate --schema=./prisma/schema.prisma; then
        log "Prisma client generated successfully"
    else
        log "ERROR: Failed to generate Prisma client"
        exit 1
    fi
}

# Main execution
log "Starting application initialization..."

# Wait for database
wait_for_db

# Run migrations with retry logic
run_migrations

# Generate Prisma client
generate_prisma_client

# Start the application
log "Starting application..."
exec npm run start:dev
