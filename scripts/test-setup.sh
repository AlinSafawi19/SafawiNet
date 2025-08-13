#!/bin/bash

echo "🧪 Testing Safawinet API Setup"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if services are running
echo "📋 Checking Docker services..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Docker services are running"
else
    echo "❌ Docker services are not running. Starting them..."
    docker-compose up -d
    echo "⏳ Waiting for services to be ready..."
    sleep 15
fi

# Check API health
echo "🏥 Checking API health..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API is responding"
    curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "❌ API is not responding. Starting it..."
    cd server/api
    npm run start:dev &
    cd ../..
    echo "⏳ Waiting for API to start..."
    sleep 10
    
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ API is now responding"
        curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
    else
        echo "❌ API is still not responding"
    fi
fi

# Check database connection
echo "🗄️  Checking database connection..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Redis connection
echo "🔴 Checking Redis connection..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

# Check Mailhog
echo "📧 Checking Mailhog..."
if curl -s http://localhost:8025 > /dev/null; then
    echo "✅ Mailhog is accessible"
else
    echo "❌ Mailhog is not accessible"
fi

# Check OTel Collector
echo "📊 Checking OpenTelemetry Collector..."
if curl -s http://localhost:13133 > /dev/null 2>&1; then
    echo "✅ OTel Collector is accessible"
else
    echo "❌ OTel Collector is not accessible"
fi

echo ""
echo "🎯 Setup Test Summary:"
echo "======================"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🌐 Service URLs:"
echo "API: http://localhost:3000"
echo "Health: http://localhost:3000/health"
echo "Swagger: http://localhost:3000/docs"
echo "Mailhog: http://localhost:8025"
echo "PostgreSQL: localhost:5432"
echo "Redis: localhost:6379"

echo ""
echo "✅ Setup test complete!"
