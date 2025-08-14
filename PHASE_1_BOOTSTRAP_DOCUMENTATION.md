# Phase 1: Bootstrap & Infrastructure Documentation

## Overview
Phase 1 establishes the foundational infrastructure for the SafawiNet API project. This phase focuses on setting up the development environment, tooling, and basic application structure.

## Goals Achieved ✅

### 1. Repository Structure & Development Workflow
- ✅ **Trunk-based development**: Main branch with short-lived feature branches (`feat/*`)
- ✅ **Git workflow**: Proper branching strategy for collaborative development
- ✅ **Project organization**: Clean, scalable directory structure

### 2. NestJS Application Scaffolding
- ✅ **Application setup**: `npx @nestjs/cli new api`
- ✅ **Core framework**: NestJS with TypeScript
- ✅ **Module structure**: Organized, modular architecture

### 3. Package Dependencies

#### Core Dependencies
```json
{
  "@nestjs/config": "^4.0.2",        // Environment configuration
  "@nestjs/throttler": "^6.4.0",     // Rate limiting
  "@nestjs/jwt": "^11.0.0",          // JWT authentication
  "zod": "^4.0.17",                  // Schema validation
  "nestjs-zod": "^4.3.1",            // Zod integration for NestJS
  "@prisma/client": "^6.14.0",       // Database ORM
  "argon2": "^0.44.0",               // Password hashing
  "ioredis": "^5.7.0",               // Redis client
  "nodemailer": "^7.0.5",            // Email sending
  "pino": "^9.9.0",                  // Structured logging
  "pino-http": "^10.5.0"             // HTTP request logging
}
```

#### Development Dependencies
```json
{
  "prisma": "^6.14.0",               // Database migrations
  "@swc/core": "^1.13.3",            // Fast TypeScript compiler
  "@swc/cli": "^0.6.0",              // SWC CLI tools
  "ts-node": "^10.9.2",              // TypeScript execution
  "ts-jest": "^29.4.1",              // TypeScript testing
  "jest": "^29.7.0",                 // Testing framework
  "supertest": "^7.1.4"              // HTTP testing
}
```

## Project Structure

```
safawinet/
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI/CD pipeline
├── docker-compose.yml               # Development stack
├── Dockerfile                       # Production build
├── Dockerfile.dev                   # Development build
├── env.template                     # Environment variables template
├── Makefile                         # Development commands
├── otel-collector-config.yaml       # OpenTelemetry configuration
├── server/
│   └── api/                         # NestJS application
│       ├── src/
│       │   ├── auth/                # Authentication module
│       │   ├── health/              # Health checks
│       │   ├── users/               # User management
│       │   ├── common/              # Shared utilities
│       │   ├── app.controller.ts    # Main controller
│       │   ├── app.module.ts        # Root module
│       │   ├── app.service.ts       # Main service
│       │   └── main.ts              # Application entry point
│       ├── prisma/                  # Database schema & migrations
│       ├── test/                    # End-to-end tests
│       ├── package.json             # Dependencies
│       └── tsconfig.json            # TypeScript configuration
└── scripts/                         # Setup and utility scripts
```

## Docker Development Stack

### Services Configuration

#### PostgreSQL 15 (Database)
```yaml
postgres:
  image: postgres:15-alpine
  container_name: safawinet-postgres
  environment:
    POSTGRES_DB: safawinet
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: alin123M
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
```

#### Redis 7 (Caching & Rate Limiting)
```yaml
redis:
  image: redis:7-alpine
  container_name: safawinet-redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

#### Mailhog (Email Testing)
```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: safawinet-mailhog
  ports:
    - "1025:1025"  # SMTP
    - "8025:8025"  # Web UI
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8025"]
    interval: 10s
    timeout: 5s
    retries: 5
```

#### OpenTelemetry Collector (Observability)
```yaml
otel-collector:
  image: otel/opentelemetry-collector:latest
  container_name: safawinet-otel-collector
  command: ["--config=/etc/otel-collector-config.yaml"]
  volumes:
    - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
  ports:
    - "13133:13133"  # Health check endpoint
    - "4317:4317"    # OTLP gRPC
    - "4318:4318"    # OTLP HTTP
```

#### NestJS API (Main Application)
```yaml
api:
  build:
    context: ./server/api
    dockerfile: Dockerfile.dev
  container_name: safawinet-api
  ports:
    - "3000:3000"
  environment:
    NODE_ENV: development
    DATABASE_URL: postgresql://postgres:alin123M@postgres:5432/safawinet
    REDIS_URL: redis://redis:6379
    MAIL_HOST: mailhog
    MAIL_PORT: 1025
    OTEL_ENDPOINT: http://otel-collector:4318
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    mailhog:
      condition: service_healthy
    otel-collector:
      condition: service_started
  volumes:
    - ./server/api:/app
    - /app/node_modules
  command: npm run start:dev
```

## Health Endpoints

### Basic Health Check
```typescript
@Get()
@ApiOperation({ summary: 'Health check endpoint' })
@ApiResponse({ status: 200, description: 'Service is healthy' })
check() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

### Liveness Probe
```typescript
@Get('liveness')
@ApiOperation({ summary: 'Liveness probe endpoint' })
@ApiResponse({ status: 200, description: 'Service is alive' })
liveness() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
  };
}
```

### Readiness Probe
```typescript
@Get('readiness')
@ApiOperation({ summary: 'Readiness probe endpoint' })
@ApiResponse({ status: 200, description: 'Service is ready' })
readiness() {
  return {
    status: 'ready',
    timestamp: new Date().toISOString(),
  };
}
```

## CI/CD Pipeline

### GitHub Actions Configuration
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: safawinet_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: server/api/package-lock.json
    
    - name: Install dependencies
      working-directory: server/api
      run: npm ci
    
    - name: Run linting
      working-directory: server/api
      run: npm run lint
    
    - name: Run tests
      working-directory: server/api
      run: npm run test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/safawinet_test
        REDIS_URL: redis://localhost:6379
        NODE_ENV: test
    
    - name: Run e2e tests
      working-directory: server/api
      run: npm run test:e2e
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/safawinet_test
        REDIS_URL: redis://localhost:6379
        NODE_ENV: test

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Build Docker image
      working-directory: server/api
      run: |
        docker build -t safawinet-api:${{ github.sha }} .
        docker build -t safawinet-api:latest .
    
    - name: Log image info
      run: |
        docker images safawinet-api
```

## Development Commands

### Makefile Commands
```makefile
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
```

## Environment Configuration

### Environment Variables Template
```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:alin123M@localhost:5432/safawinet"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Mail Configuration
MAIL_HOST="localhost"
MAIL_PORT="1025"

# Frontend Configuration
FRONTEND_URL="http://localhost:3000"

# OpenTelemetry Configuration
OTEL_ENDPOINT="http://localhost:4318"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-key-change-in-production"

# Application Configuration
PORT=3000
NODE_ENV=development

# Copy this file to .env and update the values as needed
# cp env.template .env
```

## Swagger Documentation

### Configuration
```typescript
// Swagger configuration (dev only)
if (process.env.NODE_ENV === 'development') {
  const config = new DocumentBuilder()
    .setTitle('SafawiNet API')
    .setDescription('The SafawiNet API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
```

### Available Endpoints
- **Health Check**: `GET /health`
- **Liveness Probe**: `GET /health/liveness`
- **Readiness Probe**: `GET /health/readiness`
- **API Documentation**: `GET /docs` (development only)

## Definition of Done ✅

### Infrastructure Requirements
- ✅ `docker-compose up` brings up all services (API, PostgreSQL, Redis, Mailhog, OTel Collector)
- ✅ `GET /health` returns 200 with service status
- ✅ CI runs tests on pull requests
- ✅ Swagger documentation available at `/docs` (development only)
- ✅ All services have health checks configured
- ✅ Development environment is fully containerized

### Quality Assurance
- ✅ All dependencies installed and configured
- ✅ TypeScript compilation working
- ✅ ESLint configuration in place
- ✅ Jest testing framework configured
- ✅ Docker builds successfully
- ✅ Environment variables properly templated

## Quick Start Guide

### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd safawinet

# Copy environment template
cp env.template .env

# Install dependencies
make install

# Start development stack
make up

# Setup database
make db-generate
make db-migrate
make db-seed

# Start API
make dev
```

### 2. Verify Installation
```bash
# Check service health
make health

# View logs
make logs

# Run tests
make test
```

### 3. Access Services
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Mailhog**: http://localhost:8025
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

After completing Phase 1, the project is ready for:
- **Phase 2**: User & Session Foundations

The infrastructure provides a solid foundation for building secure, scalable authentication features with proper development tooling and production readiness.
