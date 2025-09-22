# SAFAWI NET Development Guide

This document provides comprehensive documentation for manually managing the SAFAWI NET full-stack application using Docker commands.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Services Management](#docker-services-management)
- [Client Development](#client-development)
- [API Development](#api-development)
- [Common Development Scenarios](#common-development-scenarios)
- [Service-Specific Commands](#service-specific-commands)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The SAFAWI NET development environment consists of multiple Docker services that can be managed manually using Docker Compose commands:

- **PostgreSQL** - Database service
- **Redis** - Cache service
- **MailHog** - Email testing service
- **OpenTelemetry Collector** - Monitoring and observability
- **API** - NestJS backend service
- **Client** - Next.js frontend service

## 🔧 Prerequisites

- Docker and Docker Compose installed
- Node.js and npm (for local development)
- Git

## 🚀 Quick Start

### Start Everything (Recommended)
```bash
docker-compose up
```

### Start Individual Services
```bash
# Start database services only
docker-compose up postgres redis

# Start API with dependencies
docker-compose up postgres redis api

# Start client with API
docker-compose up api client
```

### Start in Background
```bash
# Start all services in background
docker-compose up -d

# Start specific services in background
docker-compose up -d postgres redis
```

## 🐳 Docker Services Management

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `docker-compose up` | Start all services | `docker-compose up` |
| `docker-compose up -d` | Start services in background | `docker-compose up -d` |
| `docker-compose up [services]` | Start specific services | `docker-compose up postgres redis` |
| `docker-compose down` | Stop all services | `docker-compose down` |
| `docker-compose restart [services]` | Restart services | `docker-compose restart api` |
| `docker-compose logs [services]` | Show service logs | `docker-compose logs api` |
| `docker-compose build [services]` | Build services | `docker-compose build api` |
| `docker-compose ps` | Show service status | `docker-compose ps` |

### Service Management

#### Start All Services
```bash
docker-compose up
```

#### Start Specific Services
```bash
# Database services
docker-compose up postgres redis

# API with dependencies
docker-compose up postgres redis api

# Client with API
docker-compose up api client

# Email testing
docker-compose up mailhog

# Monitoring
docker-compose up otel-collector
```

#### Stop Services
```bash
# Stop all services
docker-compose down

# Stop specific services
docker-compose stop postgres redis
```

#### View Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs api
docker-compose logs client

# Follow logs in real-time
docker-compose logs -f api
```

#### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific services
docker-compose restart api client
```

#### Build Services
```bash
# Build all services
docker-compose build

# Build specific services
docker-compose build api client
```

## 💻 Client Development

### Using Docker
```bash
# Start client with API
docker-compose up api client

# View client logs
docker-compose logs client

# Restart client
docker-compose restart client
```

### Local Development (Alternative)
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev

# Clear cache and restart
rm -rf .next
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Analyze bundle
npm run analyze
```

### Client Features
- **Hot Reloading**: Automatic reload on file changes
- **Cache Management**: Clear `.next` directory for fresh start
- **Performance Optimizations**: Turbopack enabled, telemetry disabled
- **Bundle Analysis**: Built-in performance monitoring tools

## 🔧 API Development

### Using Docker
```bash
# Start API with database setup
docker-compose up postgres redis api

# View API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

### Local Development (Alternative)
```bash
# Navigate to API directory
cd server/api

# Install dependencies
npm install

# Start with database setup
npm run start:with-db

# Development mode only
npm run start:dev

# Build API server
npm run build

# Database management
npm run db:setup    # Setup database (migrate + seed)
npm run prisma:reset # Reset database
npm run prisma:seed  # Seed database

# Code quality
npm run lint
npm run format
```

### Database Management
- **Automatic Setup**: Runs migrations and seeds on start
- **Reset Capability**: Complete database reset with `npm run prisma:reset`
- **Seed Management**: Separate seeding with `npm run prisma:seed`
- **Migration Support**: Built-in Prisma migration support

## 🎯 Common Development Scenarios

### 1. Full Stack Development
```bash
# Start everything
docker-compose up
```
This starts all services including PostgreSQL, Redis, MailHog, OpenTelemetry, API, and Client.

### 2. API Development with Database
```bash
# Start database services
docker-compose up postgres redis

# Start API with database setup
docker-compose up postgres redis api
```

### 3. Client Development
```bash
# Start API services
docker-compose up postgres redis api

# Start client (in another terminal)
docker-compose up client
```

### 4. Email Testing
```bash
# Start MailHog
docker-compose up mailhog

# Access email interface at http://localhost:8025
```

### 5. Monitoring & Observability
```bash
# Start OpenTelemetry collector
docker-compose up otel-collector

# View metrics at http://localhost:8888
```

## 🔧 Service-Specific Commands

### Database Services

#### PostgreSQL
```bash
# Start PostgreSQL only
docker-compose up postgres

# View PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d safawinet_dev
```

#### Redis
```bash
# Start Redis only
docker-compose up redis

# View Redis logs
docker-compose logs redis

# Connect to Redis CLI
docker-compose exec redis redis-cli
```

#### Both Database Services
```bash
# Start both PostgreSQL and Redis
docker-compose up postgres redis
```

### Email Testing

#### MailHog
```bash
# Start MailHog
docker-compose up mailhog

# Access web interface
# http://localhost:8025

# View MailHog logs
docker-compose logs mailhog
```

### Monitoring

#### OpenTelemetry Collector
```bash
# Start monitoring services
docker-compose up otel-collector

# View metrics
# http://localhost:8888 (Prometheus metrics)
# http://localhost:8889 (Prometheus exporter metrics)

# View OpenTelemetry logs
docker-compose logs otel-collector
```

### API Development

#### With Database
```bash
# Start API with full database setup
docker-compose up postgres redis api
```

#### Development Mode Only
```bash
# Start API without database setup (if running locally)
cd server/api
npm run start:dev
```

#### Database Management
```bash
# Reset database (local development)
cd server/api
npm run prisma:reset

# Seed database (local development)
cd server/api
npm run prisma:seed
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# On Linux/Mac
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :6379
```

#### 2. Docker Issues
```bash
# Clean up Docker resources
docker-compose down -v --remove-orphans
docker system prune -f

# Rebuild services
docker-compose build --no-cache

# Check service status
docker-compose ps

# View service logs
docker-compose logs [service-name]
```

#### 3. Client Cache Issues
```bash
# Clear client cache (local development)
cd client
rm -rf .next
npm run dev

# Or restart Docker client
docker-compose restart client
```

#### 4. Database Issues
```bash
# Reset database (local development)
cd server/api
npm run prisma:reset

# Or reset via Docker
docker-compose down
docker-compose up postgres
```

#### 5. Permission Issues
```bash
# On Linux/Mac, fix Docker permissions
sudo chown -R $USER:$USER .

# On Windows, run PowerShell as Administrator
```

### Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Client | http://localhost:3001 | Next.js client |
| API | http://localhost:3000 | NestJS API |
| MailHog Web | http://localhost:8025 | Email testing interface |
| MailHog SMTP | localhost:1025 | SMTP server |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| OpenTelemetry | localhost:4317 | gRPC receiver |
| OpenTelemetry HTTP | localhost:4318 | HTTP receiver |
| Prometheus Metrics | http://localhost:8888 | Metrics endpoint |

### Log Locations

| Service | Log Location |
|---------|--------------|
| API | `docker-compose logs api` |
| Client | `docker-compose logs client` |
| PostgreSQL | `docker-compose logs postgres` |
| Redis | `docker-compose logs redis` |
| MailHog | `docker-compose logs mailhog` |
| OpenTelemetry | `docker-compose logs otel-collector` |

## 🧹 Cleanup Commands

### Stop All Services
```bash
docker-compose down
```

### Clean Up Resources
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v --remove-orphans

# Remove unused Docker resources
docker system prune -f

# Remove all unused images
docker image prune -a -f
```

### Reset Everything
```bash
# Complete reset
docker-compose down -v --remove-orphans
docker system prune -a -f
docker-compose up --build
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Development](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

## 🤝 Contributing

When adding new services or modifying existing ones:

1. Update the `docker-compose.yml` file
2. Update this documentation
3. Test all scenarios
4. Update the service URLs and troubleshooting sections

## 📝 Notes

- All services are configured for development with hot reloading
- Database migrations and seeding are automated in the API service
- All services include proper error handling and logging
- Services are configured to work together seamlessly
- Environment variables are set in the docker-compose.yml file