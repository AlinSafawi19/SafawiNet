#!/bin/sh

set -e

echo "Starting application initialization..."

# Wait for database using a simple approach
echo "Waiting for database to be ready..."
until npx prisma db execute --stdin <<EOF > /dev/null 2>&1
SELECT 1;
EOF
do
    echo "Database not ready, waiting..."
    sleep 2
done
echo "Database is ready!"

# Run migrations with simple retry
echo "Running database migrations..."
for i in 1 2 3; do
    echo "Migration attempt $i/3"
    if npx prisma migrate deploy; then
        echo "Migrations completed successfully"
        break
    else
        if [ $i -eq 3 ]; then
            echo "ERROR: Failed to run migrations after 3 attempts"
            exit 1
        fi
        echo "Migration failed, retrying in 5 seconds..."
        sleep 5
    fi
done

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting application..."
exec npm run start:dev
