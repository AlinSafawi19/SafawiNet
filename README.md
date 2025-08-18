# Safawinet API

A modern NestJS-based API server with comprehensive tooling, local development environment, and CI/CD pipeline.

## 🚀 Features

- **NestJS Framework**: Modern, scalable Node.js framework
- **PostgreSQL**: Primary database with Prisma ORM
- **Redis**: Caching and session storage
- **Mailhog**: Email testing in development
- **OpenTelemetry**: Observability and monitoring
- **Docker**: Complete development environment
- **CI/CD**: GitHub Actions with automated testing
- **Swagger**: API documentation (development only)
- **Health Checks**: Liveness and readiness probes

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: NestJS
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache**: Redis 7
- **Email Testing**: Mailhog
- **Observability**: OpenTelemetry Collector
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git
- K6 (for performance testing)

### Installing K6

**Windows:**
```bash
# Using Chocolatey
choco install k6

# Using Scoop
scoop install k6
```

**macOS:**
```bash
# Using Homebrew
brew install k6
```

**Linux:**
```bash
# Using package manager
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd safawinet
```

### 2. Install dependencies

```bash
npm run install:api
```

### 3. Start the development environment

```bash
# Start all services and development server
npm run start:dev

# Or step by step:
docker compose up -d
npm run prisma:generate
npm run db:migrate
npm run start:dev
```

### 4. Access the services

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **Mailhog**: http://localhost:8025
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🛠️ Development Commands

### Essential Commands
```bash
# Start development environment
npm run start:dev

# Run tests
npm run test
npm run test:e2e

# Database operations
npm run prisma:generate
npm run db:migrate

# Performance testing
k6 run tests/perf/login_burst.js
```

### Windows Users
```bash
# Using batch file
dev.bat start
dev.bat test
dev.bat perf

# Using PowerShell
.\scripts\dev.ps1 start-dev
.\scripts\dev.ps1 test
```

### Docker Operations
```bash
npm run docker:up      # Start services
npm run docker:down    # Stop services
npm run docker:logs    # View logs
```

## 🔧 Development

### Environment Variables

Copy `env.template` to `.env` and configure:

```bash
cp env.template .env
```

**Note**: The project uses Docker Compose for development. The `.env` file in the root directory contains all necessary environment variables for the containerized environment.

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🐳 Docker

### Development Stack

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production Build

```bash
# Build production image
docker build -t safawinet-api:latest .

# Run production container
docker run -p 3000:3000 safawinet-api:latest
```

## 🔄 CI/CD

The project uses GitHub Actions for continuous integration:

- **Lint & Test**: Runs on every PR and push to main/develop
- **Build**: Creates Docker images on main branch
- **Services**: PostgreSQL and Redis for testing

### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## 📊 Health Checks

The API provides several health check endpoints:

- `GET /health` - General health status
- `GET /health/liveness` - Liveness probe for Kubernetes
- `GET /health/readiness` - Readiness probe for Kubernetes

## 📚 API Documentation

Swagger documentation is available at `/docs` in development mode.

## 🏗️ Project Structure

```
server/api/
├── src/
│   ├── health/           # Health check endpoints
│   ├── auth/             # Authentication & authorization
│   ├── users/            # User management
│   ├── common/           # Shared services & utilities
│   ├── app.module.ts     # Main application module
│   ├── main.ts          # Application bootstrap
│   └── ...
├── prisma/              # Database schema and migrations
├── test/                # Test files
├── Dockerfile           # Production Docker image
├── Dockerfile.dev       # Development Docker image
├── docker-compose.yml   # Development environment
└── package.json         # Dependencies and scripts
```

## 📋 Development Phases

The project is developed in phases, each building upon the previous:

### Phase 1: Bootstrap & Foundation
- Basic NestJS setup with health checks
- Docker development environment
- CI/CD pipeline with GitHub Actions
- **Status**: ✅ Complete

### Phase 2: Core Infrastructure
- Database setup with PostgreSQL & Prisma
- Redis integration for caching
- Environment configuration
- **Status**: ✅ Complete

### Phase 3: Authentication System
- User registration and login
- JWT-based authentication
- Email verification system
- **Status**: ✅ Complete

### Phase 4: Password Recovery
- Forgot password functionality
- Secure password reset via email
- **Status**: ✅ Complete

### Phase 5: Two-Factor Authentication
- TOTP-based 2FA setup
- Backup codes for recovery
- Enhanced security measures
- **Status**: ✅ Complete

### Phase 6: Account Recovery
- Recovery email system
- Account staging and verification
- **Status**: ✅ Complete

### Phase 7: Account Preferences
- User preference management
- Email change functionality
- **Status**: ✅ Complete

### Phase 8: Sessions & Notifications
- Device session management
- Device fingerprinting and tracking
- Notification system with cursor pagination
- Security alerts and account updates
- **Status**: ✅ Complete

### Upcoming Phases
- Phase 9: Advanced Security Features
- Phase 10: User Management & Admin
- Phase 11: API Rate Limiting & Monitoring
- Phase 12: Advanced Notifications
- Phase 13: Audit Logging
- Phase 14: UX Enhancements

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit your changes: `git commit -m 'feat: add your feature'`
5. Push to the branch: `git push origin feat/your-feature`
6. Create a Pull Request

## 📝 Definition of Done

- [ ] `docker-compose up` brings up API + DB + Redis + Mailhog
- [ ] `GET /health` returns 200
- [ ] CI runs tests on PR
- [ ] All health checks pass
- [ ] Swagger documentation is accessible
- [ ] Environment variables are properly configured

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5432, 6379, 8025 are available
2. **Database connection**: Check if PostgreSQL container is healthy
3. **Redis connection**: Verify Redis container is running
4. **Permission issues**: Ensure Docker has proper permissions

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs api
docker-compose logs postgres
```

## 📄 License

This project is licensed under the MIT License.
