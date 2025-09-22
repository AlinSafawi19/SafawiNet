# Safawinet Makefile
# Development commands only

.PHONY: help test lint migrate-seed

# Default target
help:
	@echo "Safawinet Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Testing & Quality:"
	@echo "  test         - Run all tests"
	@echo "  test-watch   - Run tests in watch mode"
	@echo "  lint         - Run linting"
	@echo "  format       - Format code"
	@echo ""
	@echo "Database:"
	@echo "  migrate      - Run database migrations"
	@echo "  seed         - Seed database"
	@echo "  db-reset     - Reset database (dev only)"

# Testing & Quality
test:
	@echo "🧪 Running tests..."
	cd server/api && npm run test

test-watch:
	@echo "🧪 Running tests in watch mode..."
	cd server/api && npm run test:watch

test-e2e:
	@echo "🧪 Running e2e tests..."
	cd server/api && npm run test:e2e

lint:
	@echo "🔍 Running linting..."
	cd server/api && npm run lint

format:
	@echo "✨ Formatting code..."
	cd server/api && npm run format

# Database Operations
migrate:
	@echo "🗄️ Running database migrations..."
	cd server/api && npx prisma migrate deploy

migrate-dev:
	@echo "🗄️ Running development migrations..."
	cd server/api && npx prisma migrate dev

seed:
	@echo "🌱 Seeding database..."
	cd server/api && npm run db:seed

db-reset:
	@echo "🔄 Resetting database (development only)..."
	cd server/api && npx prisma migrate reset --force

db-push:
	@echo "📤 Pushing schema to database..."
	cd server/api && npx prisma db push

# Health Checks
health-dev:
	@echo "🏥 Checking development health..."
	curl -f http://localhost:3000/health || echo "❌ Health check failed"

# Setup Commands
setup-dev:
	@echo "⚙️ Setting up development environment..."
	cp env.dev .env
	@echo "✅ Please edit .env with your development values"