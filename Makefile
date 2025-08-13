.PHONY: help install dev up down build test lint clean db-reset db-migrate db-studio

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	cd server/api && npm install

dev: ## Start development server
	cd server/api && npm run start:dev

up: ## Start all Docker services
	docker-compose up -d

down: ## Stop all Docker services
	docker-compose down

build: ## Build Docker images
	docker-compose build

test: ## Run tests
	cd server/api && npm test

test-e2e: ## Run end-to-end tests
	cd server/api && npm run test:e2e

lint: ## Run linting
	cd server/api && npm run lint

lint-fix: ## Fix linting issues
	cd server/api && npm run lint:fix

clean: ## Clean up Docker resources
	docker-compose down -v --remove-orphans
	docker system prune -f

db-reset: ## Reset database
	cd server/api && npx prisma migrate reset

db-migrate: ## Run database migrations
	cd server/api && npx prisma migrate dev

db-studio: ## Open Prisma Studio
	cd server/api && npx prisma studio

db-generate: ## Generate Prisma client
	cd server/api && npx prisma generate

logs: ## View Docker logs
	docker-compose logs -f

logs-api: ## View API logs
	docker-compose logs -f api

logs-db: ## View database logs
	docker-compose logs -f postgres

health: ## Check service health
	@echo "Checking service health..."
	@curl -s http://localhost:3000/health || echo "API not responding"
	@docker-compose ps

setup: ## Complete initial setup
	@echo "Setting up development environment..."
	make install
	make up
	@echo "Waiting for services to be ready..."
	@sleep 10
	make db-generate
	make db-migrate
	@echo "Setup complete! Run 'make dev' to start the API"
