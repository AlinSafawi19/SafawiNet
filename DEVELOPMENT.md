# Development Commands

This document outlines the commands that developers will actually run during development.

## Local Development

### 1. Start Infrastructure Services
```bash
docker compose up -d
```
This starts all required services:
- PostgreSQL database
- Redis cache
- MailHog (email testing)
- OpenTelemetry collector

### 2. Generate Prisma Client
```bash
npm run prisma:generate
```
Generates the Prisma client based on your schema changes.

### 3. Run Database Migrations
```bash
npm run db:migrate
```
Runs `prisma migrate dev` to apply and create new migrations.

### 4. Start Development Server
```bash
npm run start:dev
```
Starts the NestJS development server with hot reload.

### 5. Run Tests
```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e
```

## Database Operations

### Local Development
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates new migrations if needed)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed

# Reset database (careful - deletes all data)
npm run db:reset
```

### Staging/Production Migrations
```bash
# Deploy migrations (CI/CD task)
npm run db:migrate:deploy
```
This command is typically run as a one-off task inside ECS task definitions.

## Performance Testing

### Prerequisites
K6 needs to be installed separately as it's not an npm package:

**Windows:**
```bash
# Using Chocolatey
choco install k6

# Using Scoop
scoop install k6

# Or download from https://k6.io/docs/getting-started/installation/
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

### K6 Load Tests
```bash
# Quick burst test
k6 run tests/perf/login_burst.js

# Full load test
k6 run k6-load-test.js
```

### Custom K6 Tests
```bash
# Test against specific environment
API_URL=https://staging-api.example.com k6 run tests/perf/login_burst.js

# Test with custom parameters
k6 run --env API_URL=http://localhost:3000 tests/perf/login_burst.js
```

## Docker Operations

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart
```

## Complete Development Workflow

1. **Initial Setup**
   ```bash
   npm run install:api
   docker compose up -d
   npm run prisma:generate
   npm run db:migrate
   npm run start:dev
   ```

2. **Daily Development**
   ```bash
   docker compose up -d
   npm run start:dev
   ```

3. **After Schema Changes**
   ```bash
   npm run prisma:generate
   npm run db:migrate
   ```

4. **Before Committing**
   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   npm run format
   ```

## Environment Variables

Make sure you have the correct environment file:
- `.env` - Local development (copy from `env.template`)
- `env.dev` - Development environment
- `env.staging` - Staging environment  
- `env.prod` - Production environment

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker compose ps

# View database logs
docker compose logs postgres

# Reset database if needed
npm run db:reset
```

### Prisma Issues
```bash
# Regenerate client
npm run prisma:generate

# Push schema changes (for development)
npm run db:push
```

### Performance Testing Issues
```bash
# Check if API is running
curl http://localhost:3000/health

# Test with smaller load
k6 run --env VUS=1 tests/perf/login_burst.js
```
