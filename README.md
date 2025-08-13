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

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd safawinet
```

### 2. Start the development environment

```bash
# Start all services
docker-compose up -d

# Or start without the API (to run it locally)
docker-compose up -d postgres redis mailhog otel-collector
```

### 3. Install dependencies and run the API

```bash
cd server/api
npm install
npm run start:dev
```

### 4. Access the services

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **Mailhog**: http://localhost:8025
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🔧 Development

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

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
