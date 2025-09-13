# Safawinet Makefile
# Common commands for development and production

.PHONY: help dev dev-down prod prod-down test lint build clean logs migrate-seed

# Default target
help:
	@echo "Safawinet Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start development environment"
	@echo "  dev-down     - Stop development environment"
	@echo "  dev-logs     - View development logs"
	@echo ""
	@echo "Production:"
	@echo "  prod         - Start production environment (local)"
	@echo "  prod-down    - Stop production environment"
	@echo "  prod-logs    - View production logs"
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
	@echo ""
	@echo "Build & Deploy:"
	@echo "  build        - Build Docker image"
	@echo "  build-prod   - Build production Docker image"
	@echo "  clean        - Clean Docker images and volumes"
	@echo ""
	@echo "Infrastructure:"
	@echo "  tf-init      - Initialize Terraform"
	@echo "  tf-plan      - Plan Terraform changes"
	@echo "  tf-apply     - Apply Terraform changes"
	@echo "  tf-destroy   - Destroy Terraform infrastructure"

# Development Environment
dev:
	@echo "🚀 Starting development environment..."
	docker-compose up -d
	@echo "✅ Development environment started!"
	@echo "📚 API: http://localhost:3000"
	@echo "📖 Docs: http://localhost:3000/docs"
	@echo "📧 Mailhog: http://localhost:8025"

dev-down:
	@echo "🛑 Stopping development environment..."
	docker-compose down
	@echo "✅ Development environment stopped"

dev-logs:
	docker-compose logs -f api


# Production Environment (Local)
prod:
	@echo "🚀 Starting production environment..."
	@if [ ! -f .env.prod ]; then \
		echo "❌ .env.prod file not found. Please create it from env.prod template"; \
		exit 1; \
	fi
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production environment started!"
	@echo "📚 API: http://localhost:3000"
	@echo "📖 Docs: http://localhost:3000/docs"

prod-down:
	@echo "🛑 Stopping production environment..."
	docker-compose -f docker-compose.prod.yml down
	@echo "✅ Production environment stopped"

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f api

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

# Build & Deploy
build:
	@echo "🔨 Building Docker image..."
	docker build -t safawinet-api:latest ./server/api

build-prod:
	@echo "🔨 Building production Docker image..."
	docker build -f ./server/api/Dockerfile -t safawinet-api:prod ./server/api

clean:
	@echo "🧹 Cleaning Docker images and volumes..."
	docker system prune -f
	docker volume prune -f
	@echo "✅ Cleanup completed"

# Infrastructure (Terraform)
tf-init:
	@echo "🏗️ Initializing Terraform..."
	cd infrastructure/terraform && terraform init

tf-plan:
	@echo "📋 Planning Terraform changes..."
	cd infrastructure/terraform && terraform plan

tf-apply:
	@echo "🚀 Applying Terraform changes..."
	cd infrastructure/terraform && terraform apply

tf-destroy:
	@echo "💥 Destroying Terraform infrastructure..."
	cd infrastructure/terraform && terraform destroy

# AWS ECS Commands
ecs-status:
	@echo "📊 Checking ECS service status..."
	aws ecs describe-services --cluster safawinet-prod --services safawinet-api-prod

ecs-logs:
	@echo "📋 Viewing ECS logs..."
	aws logs tail /ecs/safawinet-api --follow

ecs-scale:
	@echo "📈 Scaling ECS service..."
	aws ecs update-service --cluster safawinet-prod --service safawinet-api-prod --desired-count $(count)

# Health Checks
health-dev:
	@echo "🏥 Checking development health..."
	curl -f http://localhost:3000/health || echo "❌ Health check failed"


health-prod:
	@echo "🏥 Checking production health..."
	curl -f https://api.safawinet.com/health || echo "❌ Health check failed"

# Setup Commands
setup-dev:
	@echo "⚙️ Setting up development environment..."
	cp env.template .env
	@echo "✅ Please edit .env with your development values"
	@echo "🚀 Run 'make dev' to start the environment"


setup-prod:
	@echo "⚙️ Setting up production environment..."
	cp env.prod .env.prod
	@echo "✅ Please edit .env.prod with your production values"

# Utility Commands
logs:
	@echo "📋 Viewing all logs..."
	docker-compose logs -f

logs-api:
	@echo "📋 Viewing API logs..."
	docker-compose logs -f api

logs-db:
	@echo "📋 Viewing database logs..."
	docker-compose logs -f postgres

logs-redis:
	@echo "📋 Viewing Redis logs..."
	docker-compose logs -f redis

# Development helpers
shell:
	@echo "🐚 Opening shell in API container..."
	docker-compose exec api sh

db-shell:
	@echo "🐚 Opening PostgreSQL shell..."
	docker-compose exec postgres psql -U postgres -d safawinet

redis-cli:
	@echo "🐚 Opening Redis CLI..."
	docker-compose exec redis redis-cli
